package br.com.novaroupa.service;

import br.com.novaroupa.dto.PropostaStatusDTO;
import br.com.novaroupa.model.LoteRetalho;
import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.StatusPropostaNegociacao;
import br.com.novaroupa.model.TipoPerfil;
import br.com.novaroupa.model.TipoTecido;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.LoteRetalhoRepository;
import br.com.novaroupa.repository.PropostaNegociacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

@SpringBootTest
@ActiveProfiles("dev")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:sqlite:target/test-notificacao-aceite.db",
        "spring.mail.host=localhost",
        "management.health.mail.enabled=false"
})
class PropostaAceiteNotificacaoIntegrationTests {
    @Autowired
    private PropostaNegociacaoService propostaService;
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private LoteRetalhoRepository loteRepository;
    @Autowired
    private PropostaNegociacaoRepository propostaRepository;
    @MockBean
    private JavaMailSender mailSender;

    @Test
    void aceitaPropostaEEnviaNotificacaoEmSegundoPlanoAposPersistir() {
        AtomicReference<String> threadEnvio = new AtomicReference<>();
        doAnswer(invocacao -> {
            threadEnvio.set(Thread.currentThread().getName());
            return null;
        }).when(mailSender).send(any(SimpleMailMessage.class));

        String sufixo = UUID.randomUUID().toString().substring(0, 8);
        Usuario comprador = new Usuario("comprador-email-" + sufixo, TipoPerfil.COMPRADOR);
        comprador.setNomeCompleto("Comprador de Teste");
        comprador.setEmail("comprador-" + sufixo + "@example.test");
        usuarioRepository.saveAndFlush(comprador);

        Usuario vendedor = new Usuario("vendedor-email-" + sufixo, TipoPerfil.VENDEDOR);
        vendedor.setNomeCompleto("Vendedora de Teste");
        vendedor.setEmail("vendedora@example.test");
        vendedor.setTelefoneContato("81999990000");
        usuarioRepository.saveAndFlush(vendedor);

        LoteRetalho lote = new LoteRetalho(vendedor, TipoTecido.ALGODAO, 8.0, "Azul", "Recife - PE");
        loteRepository.saveAndFlush(lote);
        PropostaNegociacao proposta = propostaRepository.saveAndFlush(
                new PropostaNegociacao(lote, comprador, "Tenho interesse", "81988887777", 120.0, 3.0));

        propostaService.atualizarStatus(proposta.getId(),
                new PropostaStatusDTO(StatusPropostaNegociacao.ACEITA), vendedor.getUsername());

        assertThat(propostaRepository.findById(proposta.getId()))
                .get().extracting(PropostaNegociacao::getStatus).isEqualTo(StatusPropostaNegociacao.ACEITA);
        ArgumentCaptor<SimpleMailMessage> mensagemCapturada = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, timeout(5_000)).send(mensagemCapturada.capture());
        SimpleMailMessage mensagem = mensagemCapturada.getValue();
        assertThat(mensagem.getTo()).containsExactly(comprador.getEmail());
        assertThat(mensagem.getText()).contains("Recife - PE", "Vendedora de Teste", "81999990000");
        assertThat(threadEnvio.get()).startsWith("email-notificacao-");
    }
}

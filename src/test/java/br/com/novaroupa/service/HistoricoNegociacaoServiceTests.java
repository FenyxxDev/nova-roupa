package br.com.novaroupa.service;

import br.com.novaroupa.dto.NegociacaoHistoricoDTO;
import br.com.novaroupa.model.DirecaoNegociacao;
import br.com.novaroupa.model.LoteRetalho;
import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.StatusPropostaNegociacao;
import br.com.novaroupa.model.TipoPerfil;
import br.com.novaroupa.model.TipoTecido;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.PropostaNegociacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Cobre a montagem do histórico (RF04), a ordenação e a regra de privacidade entre usuários. */
@ExtendWith(MockitoExtension.class)
class HistoricoNegociacaoServiceTests {

    @Mock
    private PropostaNegociacaoRepository propostaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private HistoricoNegociacaoService service;

    private static Usuario usuario(Long id, String login, TipoPerfil perfil) {
        Usuario criado = new Usuario(login, perfil);
        ReflectionTestUtils.setField(criado, "id", id);
        return criado;
    }

    private static LoteRetalho lote(Long id, Usuario vendedor) {
        LoteRetalho criado = new LoteRetalho(vendedor, TipoTecido.ALGODAO, 10.0, "Azul", "Recife");
        ReflectionTestUtils.setField(criado, "id", id);
        return criado;
    }

    private static PropostaNegociacao proposta(Long id, LoteRetalho lote, Usuario comprador,
                                               StatusPropostaNegociacao status, Double valor,
                                               Double quantidade) {
        PropostaNegociacao criada = new PropostaNegociacao(lote, comprador, "Tenho interesse",
                "81999990000", valor, quantidade);
        ReflectionTestUtils.setField(criada, "id", id);
        ReflectionTestUtils.setField(criada, "dataCriacao", LocalDateTime.of(2026, 11, 10, 8, 30));
        criada.setStatus(status);
        return criada;
    }

    @Test
    void marcaCadaPropostaComoEnviadaOuRecebidaConformeOPapelDoUsuario() {
        Usuario comprador = usuario(1L, "maria", TipoPerfil.COMPRADOR);
        Usuario vendedor = usuario(2L, "joao", TipoPerfil.VENDEDOR);
        PropostaNegociacao enviada = proposta(10L, lote(100L, vendedor), comprador,
                StatusPropostaNegociacao.ACEITA, 150.0, 4.0);
        PropostaNegociacao recebida = proposta(11L, lote(101L, comprador), vendedor,
                StatusPropostaNegociacao.RECUSADA, 120.0, 2.0);

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(comprador));
        when(propostaRepository.findHistoricoDoUsuario(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(enviada, recebida)));

        Page<NegociacaoHistoricoDTO> historico = service.historicoDe(1L, 0, 10, "maria");

        assertThat(historico.getContent()).hasSize(2);
        NegociacaoHistoricoDTO primeiro = historico.getContent().get(0);
        assertThat(primeiro.id()).isEqualTo(10L);
        assertThat(primeiro.loteId()).isEqualTo(100L);
        assertThat(primeiro.direcao()).isEqualTo(DirecaoNegociacao.ENVIADA);
        assertThat(primeiro.comprador()).isEqualTo("maria");
        assertThat(primeiro.vendedor()).isEqualTo("joao");
        assertThat(primeiro.status()).isEqualTo(StatusPropostaNegociacao.ACEITA);
        assertThat(primeiro.valorOfertado()).isEqualTo(150.0);
        assertThat(primeiro.quantidadeKg()).isEqualTo(4.0);
        assertThat(primeiro.dataCriacao()).isEqualTo(LocalDateTime.of(2026, 11, 10, 8, 30));
        assertThat(historico.getContent().get(1).direcao()).isEqualTo(DirecaoNegociacao.RECEBIDA);
        assertThat(historico.getContent().get(1).status()).isEqualTo(StatusPropostaNegociacao.RECUSADA);
    }

    @Test
    void consultaMaisRecentePrimeiroNaPaginaEComOTamanhoPedidos() {
        Usuario comprador = usuario(1L, "maria", TipoPerfil.COMPRADOR);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(comprador));
        when(propostaRepository.findHistoricoDoUsuario(eq(1L), any(Pageable.class)))
                .thenReturn(Page.empty(PageRequest.of(2, 5)));
        ArgumentCaptor<Pageable> paginacao = ArgumentCaptor.forClass(Pageable.class);

        service.historicoDe(1L, 2, 5, "maria");

        verify(propostaRepository).findHistoricoDoUsuario(eq(1L), paginacao.capture());
        Pageable pedida = paginacao.getValue();
        assertThat(pedida.getPageNumber()).isEqualTo(2);
        assertThat(pedida.getPageSize()).isEqualTo(5);
        assertThat(pedida.getSort().getOrderFor("dataCriacao").getDirection())
                .isEqualTo(Sort.Direction.DESC);
        assertThat(pedida.getSort().getOrderFor("id").getDirection()).isEqualTo(Sort.Direction.DESC);
    }

    @ParameterizedTest(name = "consulta de maria autorizada para solicitante {0} com perfil {1}")
    @CsvSource({"maria, COMPRADOR", "supervisor, ADMIN"})
    void donoEAdminPodemConsultarOMesmoHistorico(String solicitante, TipoPerfil perfilSolicitante) {
        Usuario alvo = usuario(1L, "maria", TipoPerfil.COMPRADOR);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(alvo));
        lenient().when(usuarioRepository.findByUsername(solicitante))
                .thenReturn(Optional.of(usuario(3L, solicitante, perfilSolicitante)));
        when(propostaRepository.findHistoricoDoUsuario(eq(1L), any(Pageable.class)))
                .thenReturn(Page.empty(PageRequest.of(0, 10)));

        assertThat(service.historicoDe(1L, 0, 10, solicitante).getContent()).isEmpty();
    }

    @Test
    void bloqueiaConsultaDoHistoricoDeOutroUsuario() {
        Usuario alvo = usuario(1L, "maria", TipoPerfil.COMPRADOR);
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(alvo));
        when(usuarioRepository.findByUsername("joao"))
                .thenReturn(Optional.of(usuario(2L, "joao", TipoPerfil.VENDEDOR)));

        AccessDeniedException excecao = catchThrowableOfType(
                () -> service.historicoDe(1L, 0, 10, "joao"), AccessDeniedException.class);

        assertThat(excecao).hasMessage("Cada usuário só consulta o próprio histórico de negociações");
        verifyNoInteractions(propostaRepository);
    }

    @Test
    void rejeitaIdentificadorDeUsuarioInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseStatusException excecao = catchThrowableOfType(
                () -> service.historicoDe(99L, 0, 10, "maria"), ResponseStatusException.class);

        assertThat(excecao.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(excecao).hasMessageContaining("Usuário não encontrado");
    }
}

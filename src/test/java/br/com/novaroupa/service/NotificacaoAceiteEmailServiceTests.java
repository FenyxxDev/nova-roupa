package br.com.novaroupa.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class NotificacaoAceiteEmailServiceTests {
    @Mock
    private JavaMailSender mailSender;

    @Test
    void enviaDetalhesDaRetiradaEContatoDoVendedorAoComprador() {
        NotificacaoAceiteEmailService service = new NotificacaoAceiteEmailService(mailSender, "nao-responda@novaroupa.test");

        service.enviar(evento("comprador@example.test", "vendedor@example.test", "81999990000", 150.0, 4.0));

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage mensagem = captor.getValue();
        assertThat(mensagem.getFrom()).isEqualTo("nao-responda@novaroupa.test");
        assertThat(mensagem.getTo()).containsExactly("comprador@example.test");
        assertThat(mensagem.getSubject()).contains("proposta foi aceita");
        assertThat(mensagem.getText()).contains("Recife", "81999990000", "vendedor@example.test", "150,00", "4,00");
    }

    @Test
    void usaTextoAlternativoQuandoDetalhesOpcionaisNaoEstaoDisponiveis() {
        NotificacaoAceiteEmailService service = new NotificacaoAceiteEmailService(mailSender, "nao-responda@novaroupa.test");

        service.enviar(evento("comprador@example.test", null, null, null, null));

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertThat(captor.getValue().getText()).contains("não informado");
    }

    @Test
    void naoTentaEnviarQuandoCompradorNaoPossuiEmail() {
        NotificacaoAceiteEmailService service = new NotificacaoAceiteEmailService(mailSender, "nao-responda@novaroupa.test");

        service.enviar(evento(" ", "vendedor@example.test", "81999990000", 150.0, 4.0));

        verifyNoInteractions(mailSender);
    }

    @Test
    void registraFalhaDeTransporteSemPropagarExcecaoAoFluxoDeAceite() {
        NotificacaoAceiteEmailService service = new NotificacaoAceiteEmailService(mailSender, "nao-responda@novaroupa.test");
        doThrow(new MailSendException("SMTP indisponível"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        assertThatCode(() -> service.enviar(evento("comprador@example.test", "vendedor@example.test",
                "81999990000", 150.0, 4.0))).doesNotThrowAnyException();
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    private PropostaAceitaEvent evento(String emailComprador, String emailVendedor,
                                       String telefoneVendedor, Double valor, Double quantidade) {
        return new PropostaAceitaEvent(emailComprador, "Comprador", "ALGODAO", 42L, valor, quantidade,
                "Recife", "Vendedor", emailVendedor, telefoneVendedor);
    }
}

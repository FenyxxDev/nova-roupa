package br.com.novaroupa.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.StringUtils;

import java.util.Locale;

/** Envia ao comprador, em segundo plano e somente após o commit, os dados para retirada do lote aceito. */
@Service
public class NotificacaoAceiteEmailService {
    private static final Logger LOGGER = LoggerFactory.getLogger(NotificacaoAceiteEmailService.class);

    private final JavaMailSender mailSender;
    private final String remetente;

    public NotificacaoAceiteEmailService(JavaMailSender mailSender,
                                         @Value("${app.mail.from:no-reply@novaroupa.local}") String remetente) {
        this.mailSender = mailSender;
        this.remetente = remetente;
    }

    @Async("emailTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void enviar(PropostaAceitaEvent evento) {
        if (!StringUtils.hasText(evento.emailComprador())) {
            LOGGER.warn("Notificação da proposta aceita {} ignorada: comprador sem e-mail cadastrado", evento.loteId());
            return;
        }

        SimpleMailMessage mensagem = criarMensagem(evento);
        try {
            mailSender.send(mensagem);
            LOGGER.info("Notificação de aceite enviada ao comprador para o lote {}", evento.loteId());
        } catch (MailException excecao) {
            LOGGER.error("Falha ao enviar notificação de aceite do lote {} para {}",
                    evento.loteId(), evento.emailComprador(), excecao);
        }
    }

    private SimpleMailMessage criarMensagem(PropostaAceitaEvent evento) {
        SimpleMailMessage mensagem = new SimpleMailMessage();
        mensagem.setFrom(remetente);
        mensagem.setTo(evento.emailComprador());
        mensagem.setSubject("Sua proposta foi aceita - Nova Roupa");
        mensagem.setText(String.format(Locale.forLanguageTag("pt-BR"), """
                Olá, %s!

                Sua proposta para o lote %s (código %d) foi aceita.
                Quantidade negociada: %s kg
                Valor ofertado: R$ %s
                Local para retirada: %s

                Contato do vendedor: %s
                E-mail: %s
                Telefone: %s

                Esta mensagem foi enviada automaticamente pela Nova Roupa.
                """, evento.nomeComprador(), evento.tipoLote(), evento.loteId(),
                formatar(evento.quantidadeKg()), formatar(evento.valorOfertado()),
                evento.localizacaoRetirada(), evento.nomeVendedor(),
                valorOuIndisponivel(evento.emailVendedor()), valorOuIndisponivel(evento.telefoneVendedor())));
        return mensagem;
    }

    private String formatar(Double valor) {
        return valor == null ? "não informado" : String.format(Locale.forLanguageTag("pt-BR"), "%.2f", valor);
    }

    private String valorOuIndisponivel(String valor) {
        return StringUtils.hasText(valor) ? valor : "não informado";
    }
}

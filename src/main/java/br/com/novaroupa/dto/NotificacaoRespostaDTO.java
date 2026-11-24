package br.com.novaroupa.dto;

import br.com.novaroupa.model.Notificacao;
import java.time.LocalDateTime;

public record NotificacaoRespostaDTO(Long id, String tipo, String mensagem, String dadosJson, boolean lida, LocalDateTime dataCriacao) {
    public static NotificacaoRespostaDTO from(Notificacao n) {
        return new NotificacaoRespostaDTO(n.getId(), n.getTipo(), n.getMensagem(), n.getDadosJson(), n.isLida(), n.getDataCriacao());
    }
}

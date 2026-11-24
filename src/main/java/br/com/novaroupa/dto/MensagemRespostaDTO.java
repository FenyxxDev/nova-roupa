package br.com.novaroupa.dto;

import br.com.novaroupa.model.MensagemNegociacao;
import java.time.LocalDateTime;

public record MensagemRespostaDTO(Long id, Long propostaId, String autor, String conteudo, LocalDateTime dataCriacao) {
    public static MensagemRespostaDTO from(MensagemNegociacao m) {
        return new MensagemRespostaDTO(m.getId(), m.getProposta().getId(), m.getAutor().getUsername(), m.getConteudo(), m.getDataCriacao());
    }
}

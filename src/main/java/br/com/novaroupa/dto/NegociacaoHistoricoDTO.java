package br.com.novaroupa.dto;

import br.com.novaroupa.model.DirecaoNegociacao;
import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.StatusPropostaNegociacao;

import java.time.LocalDateTime;
import java.util.Objects;

/** Item do histórico de negociações (RF04): a proposta com o status atual e a direção vista pelo usuário. */
public record NegociacaoHistoricoDTO(Long id, Long loteId, String comprador, String vendedor,
                                     DirecaoNegociacao direcao, String mensagem, String telefoneContato,
                                     Double valorOfertado, Double quantidadeKg,
                                     StatusPropostaNegociacao status,
                                     LocalDateTime dataCriacao, LocalDateTime dataAtualizacao) {

    /** Monta o item marcando como ENVIADA a proposta em que o usuário consultado é o comprador. */
    public static NegociacaoHistoricoDTO de(PropostaNegociacao proposta, Long usuarioId) {
        boolean enviada = Objects.equals(proposta.getComprador().getId(), usuarioId);
        return new NegociacaoHistoricoDTO(proposta.getId(), proposta.getLote().getId(),
                proposta.getComprador().getUsername(), proposta.getLote().getVendedor().getUsername(),
                enviada ? DirecaoNegociacao.ENVIADA : DirecaoNegociacao.RECEBIDA,
                proposta.getMensagem(), proposta.getTelefoneContato(),
                proposta.getValorOfertado(), proposta.getQuantidadeKg(), proposta.getStatus(),
                proposta.getDataCriacao(), proposta.getDataAtualizacao());
    }
}

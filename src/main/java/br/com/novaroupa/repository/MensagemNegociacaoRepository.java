package br.com.novaroupa.repository;

import br.com.novaroupa.model.MensagemNegociacao;
import br.com.novaroupa.model.PropostaNegociacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MensagemNegociacaoRepository extends JpaRepository<MensagemNegociacao, Long> {
    Page<MensagemNegociacao> findByPropostaOrderByDataCriacaoAscIdAsc(PropostaNegociacao proposta, Pageable pageable);
}

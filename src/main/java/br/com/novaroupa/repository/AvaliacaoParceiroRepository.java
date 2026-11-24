package br.com.novaroupa.repository;

import br.com.novaroupa.model.AvaliacaoParceiro;
import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

/** Acesso às avaliações de parceiros persistidas. */
public interface AvaliacaoParceiroRepository extends JpaRepository<AvaliacaoParceiro, Long> {
    Optional<AvaliacaoParceiro> findByPropostaAndAvaliador(PropostaNegociacao proposta, Usuario avaliador);
    List<AvaliacaoParceiro> findByAvaliado(Usuario avaliado);
    Page<AvaliacaoParceiro> findByAvaliadoOrderByDataCriacaoDescIdDesc(Usuario avaliado, Pageable pageable);
}

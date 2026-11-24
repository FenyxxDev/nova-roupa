package br.com.novaroupa.repository;

import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.StatusPropostaNegociacao;
import br.com.novaroupa.model.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/** Acesso às propostas de negociação persistidas. */
public interface PropostaNegociacaoRepository extends JpaRepository<PropostaNegociacao, Long> {

    List<PropostaNegociacao> findByComprador(Usuario comprador);

    List<PropostaNegociacao> findByLoteVendedor(Usuario vendedor);

    /** Histórico do usuário na página pedida: propostas que ele enviou e as recebidas nos lotes dele. */
    @Query("""
            select p from PropostaNegociacao p
            where p.comprador.id = :usuarioId or p.lote.vendedor.id = :usuarioId
            """)
    Page<PropostaNegociacao> findHistoricoDoUsuario(@Param("usuarioId") Long usuarioId, Pageable pageable);

    @Query("select count(distinct p.lote.id) from PropostaNegociacao p where p.status in :statuses")
    long countDistinctLotesByStatusIn(Collection<StatusPropostaNegociacao> statuses);

    @Query("select count(distinct p.comprador.id) from PropostaNegociacao p where p.status in :statuses")
    long countDistinctCompradoresByStatusIn(Collection<StatusPropostaNegociacao> statuses);
}

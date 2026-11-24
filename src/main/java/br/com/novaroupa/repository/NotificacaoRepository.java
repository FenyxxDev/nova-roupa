package br.com.novaroupa.repository;

import br.com.novaroupa.model.Notificacao;
import br.com.novaroupa.model.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {
    Page<Notificacao> findByDestinatarioOrderByDataCriacaoDescIdDesc(Usuario destinatario, Pageable pageable);
}

package br.com.novaroupa.service;

import br.com.novaroupa.dto.NotificacaoRespostaDTO;
import br.com.novaroupa.model.Notificacao;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.NotificacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@Service
public class NotificacaoService {
    private final NotificacaoRepository repository;
    private final UsuarioRepository usuarios;
    public NotificacaoService(NotificacaoRepository repository, UsuarioRepository usuarios) { this.repository = repository; this.usuarios = usuarios; }
    @Transactional
    public Notificacao publicar(String username, String tipo, String mensagem, String dadosJson) {
        Usuario destinatario = usuario(username);
        return repository.save(new Notificacao(destinatario, tipo, mensagem, dadosJson));
    }
    @Transactional(readOnly = true)
    public Page<NotificacaoRespostaDTO> minhas(String username, int page, int size) {
        return repository.findByDestinatarioOrderByDataCriacaoDescIdDesc(usuario(username), PageRequest.of(page, size)).map(NotificacaoRespostaDTO::from);
    }
    @Transactional
    public NotificacaoRespostaDTO marcarLida(Long id, String username) {
        Notificacao n = repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificação não encontrada"));
        if (!n.getDestinatario().getUsername().equals(username)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Notificação não pertence ao usuário");
        n.setLida(true); return NotificacaoRespostaDTO.from(repository.save(n));
    }
    private Usuario usuario(String username) { return usuarios.findByUsername(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário autenticado não possui perfil local")); }
}

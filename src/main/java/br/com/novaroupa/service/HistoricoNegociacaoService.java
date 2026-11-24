package br.com.novaroupa.service;

import br.com.novaroupa.dto.NegociacaoHistoricoDTO;
import br.com.novaroupa.model.TipoPerfil;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.PropostaNegociacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

/** Consulta paginada do histórico de negociações de um usuário (RF04). */
@Service
@Transactional(readOnly = true)
public class HistoricoNegociacaoService {

    /** O critério de aceitação pede as propostas mais recentes primeiro; o identificador desempata. */
    private static final Sort MAIS_RECENTE_PRIMEIRO = Sort.by(Sort.Direction.DESC, "dataCriacao")
            .and(Sort.by(Sort.Direction.DESC, "id"));

    private final PropostaNegociacaoRepository propostaRepository;
    private final UsuarioRepository usuarioRepository;

    public HistoricoNegociacaoService(PropostaNegociacaoRepository propostaRepository,
                                      UsuarioRepository usuarioRepository) {
        this.propostaRepository = propostaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Reúne em uma página as propostas enviadas e recebidas pelo usuário informado.
     *
     * @param usuarioId    dono do histórico consultado
     * @param page         página solicitada, zero baseada
     * @param size         tamanho da página
     * @param solicitante  login autenticado na requisição
     */
    public Page<NegociacaoHistoricoDTO> historicoDe(Long usuarioId, int page, int size, String solicitante) {
        Usuario alvo = usuarioRepository.findById(usuarioId).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
        validarPermissao(alvo, solicitante);
        Pageable pageable = PageRequest.of(page, size, MAIS_RECENTE_PRIMEIRO);
        return propostaRepository.findHistoricoDoUsuario(usuarioId, pageable)
                .map(proposta -> NegociacaoHistoricoDTO.de(proposta, usuarioId));
    }

    /** Cada usuário vê só o próprio histórico; o perfil ADMIN pode auditar o de qualquer um. */
    private void validarPermissao(Usuario alvo, String solicitante) {
        if (Objects.equals(alvo.getUsername(), solicitante)) {
            return;
        }
        if (perfil(solicitante) == TipoPerfil.ADMIN) {
            return;
        }
        throw new AccessDeniedException("Cada usuário só consulta o próprio histórico de negociações");
    }

    private TipoPerfil perfil(String username) {
        return usuarioRepository.findByUsername(username).map(Usuario::getTipoPerfil).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Perfil local não encontrado"));
    }
}

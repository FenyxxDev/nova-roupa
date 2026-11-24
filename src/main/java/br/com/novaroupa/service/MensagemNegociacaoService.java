package br.com.novaroupa.service;

import br.com.novaroupa.dto.MensagemDTO;
import br.com.novaroupa.dto.MensagemRespostaDTO;
import br.com.novaroupa.model.MensagemNegociacao;
import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.MensagemNegociacaoRepository;
import br.com.novaroupa.repository.PropostaNegociacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MensagemNegociacaoService {
    private final MensagemNegociacaoRepository mensagens;
    private final PropostaNegociacaoRepository propostas;
    private final UsuarioRepository usuarios;
    public MensagemNegociacaoService(MensagemNegociacaoRepository mensagens, PropostaNegociacaoRepository propostas, UsuarioRepository usuarios) { this.mensagens = mensagens; this.propostas = propostas; this.usuarios = usuarios; }
    @Transactional
    public MensagemRespostaDTO enviar(Long propostaId, MensagemDTO dados, String username) {
        PropostaNegociacao proposta = proposta(propostaId); Usuario autor = usuario(username); autorizar(proposta, autor);
        return MensagemRespostaDTO.from(mensagens.save(new MensagemNegociacao(proposta, autor, dados.conteudo().trim())));
    }
    @Transactional(readOnly = true)
    public Page<MensagemRespostaDTO> listar(Long propostaId, String username, int page, int size) {
        PropostaNegociacao proposta = proposta(propostaId); Usuario usuario = usuario(username); autorizar(proposta, usuario);
        return mensagens.findByPropostaOrderByDataCriacaoAscIdAsc(proposta, PageRequest.of(page, size)).map(MensagemRespostaDTO::from);
    }
    private PropostaNegociacao proposta(Long id) { return propostas.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proposta não encontrada")); }
    private Usuario usuario(String username) { return usuarios.findByUsername(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário autenticado não possui perfil local")); }
    private void autorizar(PropostaNegociacao p, Usuario u) { if (!p.getComprador().getUsername().equals(u.getUsername()) && !p.getLote().getVendedor().getUsername().equals(u.getUsername())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente participantes podem acessar as mensagens"); }
}

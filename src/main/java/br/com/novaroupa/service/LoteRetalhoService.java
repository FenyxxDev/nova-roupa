package br.com.novaroupa.service;

import br.com.novaroupa.dto.LoteAtualizacaoDTO;
import br.com.novaroupa.dto.LoteCadastroDTO;
import br.com.novaroupa.dto.LoteResponseDTO;
import br.com.novaroupa.model.LoteRetalho;
import br.com.novaroupa.model.StatusLote;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.LoteRetalhoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class LoteRetalhoService {
    private final LoteRetalhoRepository loteRetalhoRepository;
    private final UsuarioRepository usuarioRepository;

    public LoteRetalhoService(LoteRetalhoRepository loteRetalhoRepository, UsuarioRepository usuarioRepository) {
        this.loteRetalhoRepository = loteRetalhoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public LoteResponseDTO cadastrarLote(LoteCadastroDTO dados, String usernameAutenticado) {
        Usuario vendedor = usuario(usernameAutenticado);
        LoteRetalho lote = new LoteRetalho(vendedor, dados.tipoTecido(), dados.pesoKg(),
                dados.corPredominante(), dados.localizacao());
        lote.setMetragemAproximada(dados.metragemAproximada());
        lote.setPrecoBaseKg(dados.precoBaseKg());
        lote.setDescricao(DescricaoLoteSanitizer.sanitize(dados.descricao()));
        lote.setFotosUrls(dados.fotosUrls());
        return resposta(loteRetalhoRepository.save(lote));
    }

    @Transactional(readOnly = true)
    public LoteResponseDTO consultar(Long id, String username, boolean admin) {
        LoteRetalho lote = encontrar(id);
        if (!admin && !lote.getVendedor().getUsername().equals(username)) {
            throw new AccessDeniedException("Você não pode consultar este anúncio");
        }
        return resposta(lote);
    }

    @Transactional(readOnly = true)
    public Page<LoteResponseDTO> meus(String username, int page, int size) {
        return loteRetalhoRepository.findByVendedorUsername(username, PageRequest.of(page, size)).map(this::resposta);
    }

    @Transactional
    public LoteResponseDTO atualizar(Long id, LoteAtualizacaoDTO dados, String username, boolean admin) {
        LoteRetalho lote = encontrar(id);
        autorizar(lote, username, admin);
        if (lote.getStatus() == StatusLote.FINALIZADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Lote finalizado não pode ser reaberto ou editado");
        }
        lote.setTipoTecido(dados.tipoTecido());
        lote.setPesoKg(dados.pesoKg());
        lote.setMetragemAproximada(dados.metragemAproximada());
        lote.setPrecoBaseKg(dados.precoBaseKg());
        lote.setCorPredominante(dados.corPredominante().trim());
        lote.setDescricao(DescricaoLoteSanitizer.sanitize(dados.descricao()));
        lote.setLocalizacao(dados.localizacao().trim());
        return resposta(loteRetalhoRepository.save(lote));
    }

    @Transactional
    public LoteResponseDTO encerrar(Long id, String username, boolean admin) {
        LoteRetalho lote = encontrar(id);
        autorizar(lote, username, admin);
        if (lote.getStatus() == StatusLote.FINALIZADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Lote já foi finalizado");
        }
        lote.setStatus(StatusLote.FINALIZADO);
        return resposta(loteRetalhoRepository.save(lote));
    }

    @Transactional
    public List<String> adicionarFotos(Long id, String username, List<String> novasUrls) {
        LoteRetalho lote = encontrar(id);
        autorizar(lote, username, false);
        List<String> urls = new ArrayList<>();
        if (lote.getFotosUrls() != null && !lote.getFotosUrls().isBlank()) {
            urls.addAll(Arrays.stream(lote.getFotosUrls().split(",")).map(String::trim).filter(s -> !s.isBlank()).toList());
        }
        urls.addAll(novasUrls);
        if (urls.size() > 3 || String.join(",", urls).length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O lote pode ter no máximo 3 fotos");
        }
        lote.setFotosUrls(String.join(",", urls));
        loteRetalhoRepository.save(lote);
        return List.copyOf(urls);
    }

    private LoteRetalho encontrar(Long id) {
        return loteRetalhoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lote não encontrado"));
    }

    private Usuario usuario(String username) {
        return usuarioRepository.findByUsername(username).orElseThrow(() -> new UsernameNotFoundException(
                "Perfil local não encontrado para o usuário autenticado"));
    }

    private void autorizar(LoteRetalho lote, String username, boolean admin) {
        if (!admin && !lote.getVendedor().getUsername().equals(username)) {
            throw new AccessDeniedException("Somente o proprietário pode alterar este anúncio");
        }
    }

    private LoteResponseDTO resposta(LoteRetalho lote) {
        return new LoteResponseDTO(lote.getId(), lote.getVendedor().getUsername(), lote.getTipoTecido(),
                lote.getPesoKg(), lote.getMetragemAproximada(), lote.getPrecoBaseKg(), lote.getCorPredominante(),
                lote.getDescricao(), lote.getFotosUrls(), lote.getLocalizacao(), lote.getStatus(), lote.getDataPublicacao());
    }
}

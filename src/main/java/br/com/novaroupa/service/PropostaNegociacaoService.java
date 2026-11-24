package br.com.novaroupa.service;

import br.com.novaroupa.dto.PropostaCadastroDTO;
import br.com.novaroupa.dto.PropostaResponseDTO;
import br.com.novaroupa.dto.PropostaStatusDTO;
import br.com.novaroupa.model.LoteRetalho;
import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.StatusLote;
import br.com.novaroupa.model.StatusPropostaNegociacao;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.LoteRetalhoRepository;
import br.com.novaroupa.repository.PropostaNegociacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/** Orquestra o envio, consulta e decisão sobre propostas de negociação. */
@Service
public class PropostaNegociacaoService {
    private final PropostaNegociacaoRepository propostaRepository;
    private final LoteRetalhoRepository loteRepository;
    private final UsuarioRepository usuarioRepository;
    private final PropostaValidacaoService validacaoService;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificacaoRealtimeService notificacoes;

    @Autowired
    public PropostaNegociacaoService(PropostaNegociacaoRepository propostaRepository,
                                     LoteRetalhoRepository loteRepository, UsuarioRepository usuarioRepository,
                                     PropostaValidacaoService validacaoService,
                                     ApplicationEventPublisher eventPublisher,
                                     NotificacaoRealtimeService notificacoes) {
        this.propostaRepository = propostaRepository;
        this.loteRepository = loteRepository;
        this.usuarioRepository = usuarioRepository;
        this.validacaoService = validacaoService;
        this.eventPublisher = eventPublisher;
        this.notificacoes = notificacoes;
    }

    /** Construtor mantido para testes unitários que não exercitam notificações. */
    public PropostaNegociacaoService(PropostaNegociacaoRepository propostaRepository,
                                     LoteRetalhoRepository loteRepository, UsuarioRepository usuarioRepository,
                                     PropostaValidacaoService validacaoService,
                                     ApplicationEventPublisher eventPublisher) {
        this(propostaRepository, loteRepository, usuarioRepository, validacaoService, eventPublisher,
                new NotificacaoRealtimeService());
    }

    @Transactional
    public PropostaResponseDTO criar(PropostaCadastroDTO dados, String username) {
        Usuario comprador = usuario(username);
        LoteRetalho lote = loteRepository.findById(dados.loteId()).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lote não encontrado"));
        if (lote.getStatus() != StatusLote.DISPONIVEL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Lote não está disponível");
        }
        validacaoService.validar(lote, dados);
        if (Objects.equals(lote.getVendedor().getId(), comprador.getId())
                && lote.getVendedor().getUsername().equals(comprador.getUsername())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vendedor não pode propor ao próprio lote");
        }
        PropostaNegociacao proposta = propostaRepository.save(new PropostaNegociacao(
                lote, comprador, dados.mensagem(), dados.telefoneContato(),
                dados.valorOfertado(), dados.quantidadeKgSolicitada()));
        Map<String, Object> dadosNotificacao = new HashMap<>();
        dadosNotificacao.put("propostaId", proposta.getId());
        dadosNotificacao.put("loteId", lote.getId());
        notificacoes.publicar(lote.getVendedor().getUsername(), "nova-proposta",
                "Você recebeu uma nova proposta para o lote #" + lote.getId(), dadosNotificacao);
        return PropostaResponseDTO.de(proposta);
    }

    @Transactional(readOnly = true)
    public List<PropostaResponseDTO> minhas(String username) {
        Usuario comprador = usuario(username);
        return propostaRepository.findByComprador(comprador).stream().map(PropostaResponseDTO::de).toList();
    }

    @Transactional(readOnly = true)
    public List<PropostaResponseDTO> recebidas(String username) {
        Usuario vendedor = usuario(username);
        return propostaRepository.findByLoteVendedor(vendedor).stream().map(PropostaResponseDTO::de).toList();
    }

    @Transactional
    public PropostaResponseDTO atualizarStatus(Long id, PropostaStatusDTO dados, String username) {
        PropostaNegociacao proposta = propostaRepository.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proposta não encontrada"));
        if (!proposta.getLote().getVendedor().getUsername().equals(username)) {
            throw new AccessDeniedException("Somente o vendedor do lote pode decidir a proposta");
        }
        if (dados.status() != StatusPropostaNegociacao.ACEITA
                && dados.status() != StatusPropostaNegociacao.RECUSADA) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status deve ser ACEITA ou RECUSADA");
        }
        if (proposta.getStatus() != StatusPropostaNegociacao.PENDENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Proposta já foi decidida");
        }
        LoteRetalho lote = proposta.getLote();
        if (dados.status() == StatusPropostaNegociacao.ACEITA) {
            if (lote.getStatus() != StatusLote.DISPONIVEL) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Lote não está disponível para venda");
            }
            // Aceite representa venda imediata: o lote não pode mais ser oferecido.
            lote.setStatus(StatusLote.FINALIZADO);
            loteRepository.save(lote);
        }
        proposta.setStatus(dados.status());
        PropostaNegociacao salva = propostaRepository.save(proposta);
        if (dados.status() == StatusPropostaNegociacao.ACEITA) {
            publicarEventoAceite(salva);
        }
        Map<String, Object> dadosNotificacao = new HashMap<>();
        dadosNotificacao.put("propostaId", salva.getId());
        dadosNotificacao.put("loteId", lote.getId());
        dadosNotificacao.put("status", dados.status().name());
        notificacoes.publicar(proposta.getComprador().getUsername(), "proposta-atualizada",
                "Sua proposta foi " + dados.status().name().toLowerCase(), dadosNotificacao);
        return PropostaResponseDTO.de(salva);
    }

    private void publicarEventoAceite(PropostaNegociacao proposta) {
        LoteRetalho lote = proposta.getLote();
        Usuario vendedor = lote.getVendedor();
        Usuario comprador = proposta.getComprador();
        eventPublisher.publishEvent(new PropostaAceitaEvent(
                comprador.getEmail(), comprador.getNomeCompleto(), lote.getTipoTecido().name(),
                lote.getId(), proposta.getValorOfertado(), proposta.getQuantidadeKg(), lote.getLocalizacao(),
                vendedor.getNomeCompleto(), vendedor.getEmail(), vendedor.getTelefoneContato()));
    }

    private Usuario usuario(String username) {
        return usuarioRepository.findByUsername(username).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Perfil local não encontrado"));
    }
}

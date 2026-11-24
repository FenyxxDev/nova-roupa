package br.com.novaroupa.controller;

import br.com.novaroupa.dto.NegociacaoHistoricoDTO;
import br.com.novaroupa.service.HistoricoNegociacaoService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Endpoint REST do histórico de negociações do usuário (RF04). */
@RestController
@RequestMapping("/api/negociacoes")
@Validated
public class HistoricoNegociacaoController {

    private final HistoricoNegociacaoService service;

    public HistoricoNegociacaoController(HistoricoNegociacaoService service) {
        this.service = service;
    }

    /** Lista paginada, mais recente primeiro, das propostas enviadas e recebidas pelo usuário. */
    @GetMapping("/usuario/{usuarioId}")
    @PreAuthorize("hasAnyRole('COMPRADOR', 'VENDEDOR', 'ADMIN')")
    public Page<NegociacaoHistoricoDTO> historicoDoUsuario(@PathVariable Long usuarioId,
                                                           @RequestParam(defaultValue = "0") @Min(0) int page,
                                                           @RequestParam(defaultValue = "10")
                                                           @Min(1) @Max(100) int size,
                                                           Authentication authentication) {
        return service.historicoDe(usuarioId, page, size, authentication.getName());
    }
}

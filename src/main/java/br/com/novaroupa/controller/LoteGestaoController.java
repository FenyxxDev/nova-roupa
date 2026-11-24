package br.com.novaroupa.controller;

import br.com.novaroupa.dto.LoteAtualizacaoDTO;
import br.com.novaroupa.dto.LoteResponseDTO;
import br.com.novaroupa.service.LoteRetalhoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lotes")
public class LoteGestaoController {
    private final LoteRetalhoService service;

    public LoteGestaoController(LoteRetalhoService service) { this.service = service; }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('VENDEDOR', 'COMPRADOR', 'ADMIN')")
    public LoteResponseDTO consultar(@PathVariable Long id, Authentication auth) {
        return service.consultar(id, auth.getName(), admin(auth));
    }

    @GetMapping("/meus")
    @PreAuthorize("hasAnyRole('VENDEDOR', 'ADMIN')")
    public Page<LoteResponseDTO> meus(@RequestParam(defaultValue = "0") @Min(0) int page,
                                      @RequestParam(defaultValue = "12") @Min(1) @Max(100) int size,
                                      Authentication auth) {
        return service.meus(auth.getName(), page, size);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('VENDEDOR', 'ADMIN')")
    public LoteResponseDTO atualizar(@PathVariable Long id, @Valid @RequestBody LoteAtualizacaoDTO dados,
                                     Authentication auth) {
        return service.atualizar(id, dados, auth.getName(), admin(auth));
    }

    @PatchMapping("/{id}/encerrar")
    @PreAuthorize("hasAnyRole('VENDEDOR', 'ADMIN')")
    public LoteResponseDTO encerrar(@PathVariable Long id, Authentication auth) {
        return service.encerrar(id, auth.getName(), admin(auth));
    }

    private boolean admin(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}

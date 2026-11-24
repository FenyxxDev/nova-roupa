package br.com.novaroupa.controller;

import br.com.novaroupa.dto.NotificacaoRespostaDTO;
import br.com.novaroupa.service.NotificacaoService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {
    private final NotificacaoService service;
    public NotificacaoController(NotificacaoService service) { this.service = service; }
    @GetMapping("/minhas")
    public Page<NotificacaoRespostaDTO> minhas(@RequestParam(defaultValue = "0") @Min(0) int page,
                                               @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
                                               Authentication auth) { return service.minhas(auth.getName(), page, size); }
    @PatchMapping("/{id}/lida")
    public NotificacaoRespostaDTO marcarLida(@PathVariable Long id, Authentication auth) { return service.marcarLida(id, auth.getName()); }
}

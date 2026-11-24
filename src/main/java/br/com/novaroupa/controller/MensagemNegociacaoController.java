package br.com.novaroupa.controller;

import br.com.novaroupa.dto.MensagemDTO;
import br.com.novaroupa.dto.MensagemRespostaDTO;
import br.com.novaroupa.service.MensagemNegociacaoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/propostas/{propostaId}/mensagens")
public class MensagemNegociacaoController {
    private final MensagemNegociacaoService service;
    public MensagemNegociacaoController(MensagemNegociacaoService service) { this.service = service; }
    @GetMapping
    public Page<MensagemRespostaDTO> listar(@PathVariable Long propostaId, @RequestParam(defaultValue = "0") @Min(0) int page,
                                            @RequestParam(defaultValue = "30") @Min(1) @Max(100) int size, Authentication auth) { return service.listar(propostaId, auth.getName(), page, size); }
    @PostMapping
    public MensagemRespostaDTO enviar(@PathVariable Long propostaId, @Valid @RequestBody MensagemDTO dados, Authentication auth) { return service.enviar(propostaId, dados, auth.getName()); }
}

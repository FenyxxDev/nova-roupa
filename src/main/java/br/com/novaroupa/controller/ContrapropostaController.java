package br.com.novaroupa.controller;

import br.com.novaroupa.dto.PropostaCadastroDTO;
import br.com.novaroupa.dto.PropostaResponseDTO;
import br.com.novaroupa.service.PropostaNegociacaoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/propostas")
public class ContrapropostaController {
    private final PropostaNegociacaoService service;
    public ContrapropostaController(PropostaNegociacaoService service) { this.service = service; }
    @PostMapping("/{id}/contrapropostas")
    @PreAuthorize("hasAnyRole('COMPRADOR', 'VENDEDOR', 'ADMIN')")
    public ResponseEntity<PropostaResponseDTO> criar(@PathVariable Long id, @Valid @RequestBody PropostaCadastroDTO dados, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criarContraproposta(id, dados, auth.getName()));
    }
}

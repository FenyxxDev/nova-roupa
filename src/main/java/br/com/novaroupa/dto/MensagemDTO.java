package br.com.novaroupa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MensagemDTO(@NotBlank @Size(max = 2000) String conteudo) {}

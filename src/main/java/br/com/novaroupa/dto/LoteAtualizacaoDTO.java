package br.com.novaroupa.dto;

import br.com.novaroupa.model.TipoTecido;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record LoteAtualizacaoDTO(
        @NotNull TipoTecido tipoTecido,
        @NotNull @Positive Double pesoKg,
        @Positive Double metragemAproximada,
        @Positive Double precoBaseKg,
        @NotBlank @Size(max = 60) String corPredominante,
        @Size(max = 1000) String descricao,
        @NotBlank @Size(max = 120) String localizacao
) {}

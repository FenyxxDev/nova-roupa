package br.com.novaroupa.dto;

import java.util.List;

public record AvaliacoesResumoDTO(double media, long total, List<AvaliacaoRespostaDTO> avaliacoes) {}

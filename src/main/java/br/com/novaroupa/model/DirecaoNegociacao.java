package br.com.novaroupa.model;

/** Sentido da negociação do ponto de vista do usuário que consulta o histórico. */
public enum DirecaoNegociacao {
    /** Proposta que o usuário enviou sobre um lote de outro vendedor. */
    ENVIADA,
    /** Proposta que o usuário recebeu em um lote dele. */
    RECEBIDA
}

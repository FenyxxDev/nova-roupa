package br.com.novaroupa.service;

/** Dados já materializados durante a transação para notificação após o commit da proposta aceita. */
public record PropostaAceitaEvent(String emailComprador, String nomeComprador,
                                  String tipoLote, Long loteId, Double valorOfertado,
                                  Double quantidadeKg, String localizacaoRetirada,
                                  String nomeVendedor, String emailVendedor,
                                  String telefoneVendedor) {
}

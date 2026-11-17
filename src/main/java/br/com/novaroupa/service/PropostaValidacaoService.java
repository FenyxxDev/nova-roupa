package br.com.novaroupa.service;

import br.com.novaroupa.dto.PropostaCadastroDTO;
import br.com.novaroupa.model.LoteRetalho;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Aplica as regras de valor e volume de retalho (RN02) às propostas de negociação. */
@Service
public class PropostaValidacaoService {

    private static final Logger log = LoggerFactory.getLogger(PropostaValidacaoService.class);

    /** Fração do valor base do lote que a proposta precisa alcançar no mínimo. */
    private static final double FATOR_VALOR_MINIMO = 0.5;

    /** Tolerância para comparações em ponto flutuante; aceita o valor exatamente no limite. */
    private static final double TOLERANCIA = 0.01;

    /**
     * Confere se a quantidade solicitada cabe no lote e se o valor ofertado atinge o mínimo.
     * Violações geram 422 com mensagem descritiva; sem preço base cadastrado a regra de valor
     * não pode ser avaliada e é ignorada.
     */
    public void validar(LoteRetalho lote, PropostaCadastroDTO dados) {
        validarVolume(lote, dados);
        validarValor(lote, dados);
    }

    private void validarVolume(LoteRetalho lote, PropostaCadastroDTO dados) {
        if (dados.quantidadeKgSolicitada() > lote.getPesoKg() + TOLERANCIA) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Quantidade solicitada excede o peso disponível do lote");
        }
    }

    private void validarValor(LoteRetalho lote, PropostaCadastroDTO dados) {
        if (lote.getPrecoBaseKg() == null) {
            log.debug("Lote sem preço base por quilo; regra de valor mínimo não avaliada");
            return;
        }
        double valorMinimo = FATOR_VALOR_MINIMO * lote.getPrecoBaseKg() * lote.getPesoKg();
        if (dados.valorOfertado() + TOLERANCIA < valorMinimo) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Valor ofertado abaixo de 50% do valor base do lote");
        }
    }
}

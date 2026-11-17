package br.com.novaroupa.controller;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Confirma o corpo e o status devolvidos pelo advice para as exceções esperadas da API. */
@ExtendWith(MockitoExtension.class)
class ApiExceptionHandlerTests {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Mock
    private ConstraintViolation<?> violacao;

    @Test
    void devolveBadRequestComMensagemPadraoParaViolacaoDeConstraint() {
        ConstraintViolationException excecao = new ConstraintViolationException(Set.of(violacao));

        ResponseEntity<Map<String, String>> resposta = handler.handleConstraintViolation(excecao);

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(resposta.getBody()).containsEntry("message", "Parâmetros da requisição inválidos");
    }

    @Test
    void preservaStatusEMensagemDaExcecaoDeNegocio() {
        ResponseStatusException excecao =
                new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Regra de lote violada");

        ResponseEntity<Map<String, String>> resposta = handler.handleResponseStatus(excecao);

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(resposta.getBody()).containsEntry("message", "Regra de lote violada");
    }

    @Test
    void usaOMensagemTecnicaQuandoNaoHaMotivoDefinido() {
        ResponseStatusException excecao = new ResponseStatusException(HttpStatus.NOT_FOUND);

        ResponseEntity<Map<String, String>> resposta = handler.handleResponseStatus(excecao);

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(resposta.getBody()).containsEntry("message", "404 NOT_FOUND");
    }
}

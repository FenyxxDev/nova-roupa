package br.com.novaroupa.service;

import br.com.novaroupa.dto.PropostaCadastroDTO;
import br.com.novaroupa.model.LoteRetalho;
import br.com.novaroupa.model.TipoPerfil;
import br.com.novaroupa.model.TipoTecido;
import br.com.novaroupa.model.Usuario;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** Cobre as regras de volume e de valor mínimo (RN02) aplicadas às propostas. */
class PropostaValidacaoServiceTests {

    private final PropostaValidacaoService service = new PropostaValidacaoService();

    /** Lote com o peso informado e preço base por quilo; nulo simula lote sem valor cadastrado. */
    private static LoteRetalho lote(Double pesoKg, Double precoBaseKg) {
        Usuario vendedor = new Usuario("vendedor-regras", TipoPerfil.VENDEDOR);
        LoteRetalho lote = new LoteRetalho(vendedor, TipoTecido.ALGODAO, pesoKg, "Azul", "Recife");
        lote.setPrecoBaseKg(precoBaseKg);
        return lote;
    }

    @Test
    void rejeitaQuantidadeMaiorQueOPesoDisponivelDoLote() {
        LoteRetalho lote = lote(10.0, 20.0);
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", null, 180.0, 10.5);

        ResponseStatusException excecao = catchThrowableOfType(
                () -> service.validar(lote, dados), ResponseStatusException.class);
        assertThat(excecao.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(excecao.getMessage()).contains("Quantidade solicitada excede o peso disponível do lote");
    }

    /** Casos limite aceitos: dentro dos limites, quantidade igual ao peso e valor exatamente em 50%. */
    @ParameterizedTest(name = "valor {0} e quantidade {1} são aceitos")
    @CsvSource({
            "180.0, 4.0",
            "180.0, 10.0",
            "100.0, 4.0"
    })
    void aceitaPropostaNosCasosLimitrofes(double valorOfertado, double quantidadeKg) {
        LoteRetalho lote = lote(10.0, 20.0);
        // Valor base do lote = 20 reais/kg * 10 kg = 200 reais; o limite mínimo aceito é 100 reais.
        PropostaCadastroDTO dados = new PropostaCadastroDTO(
                1L, "Tenho interesse", null, valorOfertado, quantidadeKg);

        assertThatCode(() -> service.validar(lote, dados)).doesNotThrowAnyException();
    }

    @Test
    void rejeitaValorAbaixoDeCinquentaPorCentoDoValorBaseDoLote() {
        LoteRetalho lote = lote(10.0, 20.0);
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", null, 99.0, 4.0);

        ResponseStatusException excecao = catchThrowableOfType(
                () -> service.validar(lote, dados), ResponseStatusException.class);
        assertThat(excecao.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(excecao.getMessage()).contains("Valor ofertado abaixo de 50% do valor base do lote");
    }

    @Test
    void aceitaPropostaQuandoLoteNaoTemPrecoBaseCadastrado() {
        LoteRetalho lote = lote(10.0, null);
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", null, 1.0, 4.0);

        assertThatCode(() -> service.validar(lote, dados)).doesNotThrowAnyException();
    }

    @Test
    void avaliaVolumeAntesDoValorQuandoAmbasAsRegrasSaoVioladas() {
        LoteRetalho lote = lote(10.0, 20.0);
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", null, 10.0, 30.0);

        ResponseStatusException excecao = catchThrowableOfType(
                () -> service.validar(lote, dados), ResponseStatusException.class);
        assertThat(excecao.getMessage()).contains("Quantidade solicitada excede o peso disponível do lote");
    }
}

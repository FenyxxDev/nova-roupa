package br.com.novaroupa.controller;

import br.com.novaroupa.model.LoteRetalho;
import br.com.novaroupa.model.TipoPerfil;
import br.com.novaroupa.model.TipoTecido;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.LoteRetalhoRepository;
import br.com.novaroupa.repository.PropostaNegociacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Exerce POST /api/propostas com dados reais para confirmar o retorno 422 das regras RN02. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:target/test-proposta-validacao.db")
class PropostaNegociacaoRotaValidacaoTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private LoteRetalhoRepository loteRepository;
    @Autowired private PropostaNegociacaoRepository propostaRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    /** Cada login usa uma origem distinta para não esbarrar no limitador de tentativas. */
    private static final AtomicInteger SEQUENCIA_DE_ORIGEM = new AtomicInteger();

    @BeforeEach
    void limparDados() {
        propostaRepository.deleteAll();
        loteRepository.deleteAll();
        usuarioRepository.deleteAll();
    }

    @Test
    void rejeitaPropostaComValorAbaixoDeCinquentaPorCentoDoLote() throws Exception {
        Long loteId = salvarLote(20.0);
        String token = obterToken("comprador", "comprador-demo-123");

        enviarProposta(token, corpo(loteId, 95.0, 4.0))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Valor ofertado abaixo de 50% do valor base do lote"));

        assertThat(propostaRepository.count()).isZero();
    }

    @Test
    void rejeitaPropostaComQuantidadeAcimaDoPesoDisponivel() throws Exception {
        Long loteId = salvarLote(20.0);
        String token = obterToken("comprador", "comprador-demo-123");

        enviarProposta(token, corpo(loteId, 150.0, 11.0))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Quantidade solicitada excede o peso disponível do lote"));

        assertThat(propostaRepository.count()).isZero();
    }

    @Test
    void aceitaPropostaDentroDasRegrasEEspelhaValoresNaResposta() throws Exception {
        Long loteId = salvarLote(20.0);
        String token = obterToken("comprador", "comprador-demo-123");

        enviarProposta(token, corpo(loteId, 150.0, 4.0))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.valorOfertado").value(150.0))
                .andExpect(jsonPath("$.quantidadeKg").value(4.0));

        assertThat(propostaRepository.count()).isEqualTo(1);
    }

    @Test
    void exigeValorEQuantidadeNoCorpoDaProposta() throws Exception {
        Long loteId = salvarLote(20.0);
        String token = obterToken("comprador", "comprador-demo-123");

        enviarProposta(token, "{\"loteId\":" + loteId + ",\"mensagem\":\"Tenho interesse\"}")
                .andExpect(status().isBadRequest());

        assertThat(propostaRepository.count()).isZero();
    }

    /** Persiste um lote de 10 kg com o preço base informado e devolve o identificador gerado. */
    private Long salvarLote(Double precoBaseKg) {
        Usuario vendedor = usuarioRepository.save(new Usuario("vendedor-rota", TipoPerfil.VENDEDOR));
        LoteRetalho lote = new LoteRetalho(vendedor, TipoTecido.ALGODAO, 10.0, "Azul", "Recife");
        lote.setPrecoBaseKg(precoBaseKg);
        return loteRepository.save(lote).getId();
    }

    private String corpo(Long loteId, Double valorOfertado, Double quantidadeKg) {
        return """
                {
                  "loteId":%d,
                  "mensagem":"Tenho interesse nesse lote",
                  "telefoneContato":"81999999999",
                  "valorOfertado":%s,
                  "quantidadeKgSolicitada":%s
                }
                """.formatted(loteId, valorOfertado, quantidadeKg);
    }

    /** Envia a proposta autenticada como comprador para a rota pública da API. */
    private ResultActions enviarProposta(String token, String corpo) throws Exception {
        return mockMvc.perform(post("/api/propostas")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo));
    }

    private String obterToken(String usuario, String senha) throws Exception {
        MvcResult resultado = mockMvc.perform(post("/api/auth/login")
                        .with(enderecoDeTeste())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + usuario + "\",\"password\":\"" + senha + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(resultado.getResponse().getContentAsString(), "$.token");
    }

    private RequestPostProcessor enderecoDeTeste() {
        return request -> {
            request.setRemoteAddr("203.0.113." + SEQUENCIA_DE_ORIGEM.incrementAndGet());
            return request;
        };
    }
}

package br.com.novaroupa.controller;

import br.com.novaroupa.model.LoteRetalho;
import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.StatusPropostaNegociacao;
import br.com.novaroupa.model.TipoPerfil;
import br.com.novaroupa.model.TipoTecido;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.LoteRetalhoRepository;
import br.com.novaroupa.repository.PropostaNegociacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Exerce GET /api/negociacoes/usuario/{id} com banco real para provar paginação, ordenação e privacidade. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:target/test-historico-negociacoes.db")
class HistoricoNegociacaoRotaTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private LoteRetalhoRepository loteRepository;
    @Autowired private PropostaNegociacaoRepository propostaRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    /** Cada login usa uma origem distinta para não esbarrar no limitador de tentativas. */
    private static final AtomicInteger SEQUENCIA_DE_ORIGEM = new AtomicInteger();

    private Usuario comprador;
    private Usuario vendedor;
    private Long idRecenteEnviada;
    private Long idRecebida;
    private Long idAntigaAceita;

    @BeforeEach
    void prepararHistorico() {
        propostaRepository.deleteAll();
        loteRepository.deleteAll();
        usuarioRepository.deleteAll();
        comprador = usuarioRepository.save(new Usuario("comprador", TipoPerfil.COMPRADOR));
        vendedor = usuarioRepository.save(new Usuario("vendedor", TipoPerfil.VENDEDOR));
        usuarioRepository.save(new Usuario("admin", TipoPerfil.ADMIN));

        LoteRetalho loteDoVendedor = salvarLote(vendedor);
        LoteRetalho loteDoComprador = salvarLote(comprador);
        idRecenteEnviada = salvarProposta(loteDoVendedor, comprador, 1, StatusPropostaNegociacao.PENDENTE).getId();
        idRecebida = salvarProposta(loteDoComprador, vendedor, 2, StatusPropostaNegociacao.PENDENTE).getId();
        idAntigaAceita = salvarProposta(loteDoVendedor, comprador, 3, StatusPropostaNegociacao.PENDENTE).getId();

        // A proposta mais antiga foi aceita depois: o histórico precisa mostrar o status atual.
        PropostaNegociacao decidida = propostaRepository.findById(idAntigaAceita).orElseThrow();
        decidida.setStatus(StatusPropostaNegociacao.ACEITA);
        propostaRepository.saveAndFlush(decidida);
    }

    @Test
    void listaHistoricoPaginadoComecandoPelasPropostasMaisRecentes() throws Exception {
        String token = obterToken("comprador", "comprador-demo-123");

        mockMvc.perform(historico(token, comprador.getId(), "0", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content[0].id").value(idRecenteEnviada))
                .andExpect(jsonPath("$.content[0].direcao").value("ENVIADA"))
                .andExpect(jsonPath("$.content[0].vendedor").value("vendedor"))
                .andExpect(jsonPath("$.content[0].status").value("PENDENTE"))
                .andExpect(jsonPath("$.content[0].dataCriacao").exists())
                .andExpect(jsonPath("$.content[1].id").value(idRecebida))
                .andExpect(jsonPath("$.content[1].direcao").value("RECEBIDA"))
                .andExpect(jsonPath("$.content[1].comprador").value("vendedor"));
    }

    @Test
    void devolvePaginaSeguinteComPropostaJaDecidida() throws Exception {
        String token = obterToken("comprador", "comprador-demo-123");

        mockMvc.perform(historico(token, comprador.getId(), "1", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(idAntigaAceita))
                .andExpect(jsonPath("$.content[0].status").value("ACEITA"))
                .andExpect(jsonPath("$.content[0].dataAtualizacao").exists());
    }

    @Test
    void adminConsegueConsultarHistoricoDeOutroUsuario() throws Exception {
        String token = obterToken("admin", "admin-demo-123");

        mockMvc.perform(historico(token, comprador.getId(), "0", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.number").value(0));
    }

    @Test
    void impedeQueUsuarioConsulteHistoricoDeOutraPessoa() throws Exception {
        String token = obterToken("comprador", "comprador-demo-123");

        mockMvc.perform(historico(token, vendedor.getId(), "0", "10"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejeitaIdentificadorDeUsuarioSemCadastro() throws Exception {
        String token = obterToken("comprador", "comprador-demo-123");

        mockMvc.perform(historico(token, 987654L, "0", "10"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Usuário não encontrado"));
    }

    @ParameterizedTest(name = "pagina {0} com tamanho {1} e rejeitada")
    @CsvSource({"-1, 10", "0, 101"})
    void rejeitaParametrosDePaginacaoForaDosLimites(String page, String size) throws Exception {
        String token = obterToken("comprador", "comprador-demo-123");

        mockMvc.perform(historico(token, comprador.getId(), page, size))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Parâmetros da requisição inválidos"));
    }

    @Test
    void exigeAutenticacaoParaConsultarHistorico() throws Exception {
        mockMvc.perform(get("/api/negociacoes/usuario/" + comprador.getId()))
                .andExpect(status().isForbidden());
    }

    /** Monta a requisição autenticada ao endpoint de histórico com a paginação pedida. */
    private MockHttpServletRequestBuilder historico(String token, Long usuarioId, String page, String size) {
        return get("/api/negociacoes/usuario/" + usuarioId)
                .header("Authorization", "Bearer " + token)
                .param("page", page)
                .param("size", size);
    }

    /** Lote de 10 kg com preço base cadastrado, pertencente ao vendedor informado. */
    private LoteRetalho salvarLote(Usuario dono) {
        LoteRetalho lote = new LoteRetalho(dono, TipoTecido.ALGODAO, 10.0, "Azul", "Recife");
        lote.setPrecoBaseKg(20.0);
        return loteRepository.save(lote);
    }

    /** Proposta com data de criação deslocada para trás, garantindo uma ordenação previsível. */
    private PropostaNegociacao salvarProposta(LoteRetalho lote, Usuario autor, int horasAtras,
                                              StatusPropostaNegociacao status) {
        PropostaNegociacao proposta = new PropostaNegociacao(lote, autor, "Tenho interesse nesse lote",
                "81999998888", 150.0, 4.0);
        ReflectionTestUtils.setField(proposta, "dataCriacao", LocalDateTime.now().minusHours(horasAtras));
        proposta.setStatus(status);
        return propostaRepository.save(proposta);
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

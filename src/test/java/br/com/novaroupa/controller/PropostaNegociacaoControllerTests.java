package br.com.novaroupa.controller;

import br.com.novaroupa.dto.PropostaCadastroDTO;
import br.com.novaroupa.dto.PropostaResponseDTO;
import br.com.novaroupa.dto.PropostaStatusDTO;
import br.com.novaroupa.model.StatusPropostaNegociacao;
import br.com.novaroupa.service.PropostaNegociacaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Verifica que cada endpoint repassa o usuário autenticado ao serviço e devolve o resultado esperado. */
@ExtendWith(MockitoExtension.class)
class PropostaNegociacaoControllerTests {

    @Mock
    private PropostaNegociacaoService service;

    private PropostaNegociacaoController controller;
    private final Authentication authentication =
            new UsernamePasswordAuthenticationToken("comprador-api", "senha-oculta");

    @BeforeEach
    void setUp() {
        controller = new PropostaNegociacaoController(service);
    }

    private static PropostaResponseDTO resposta(StatusPropostaNegociacao status) {
        LocalDateTime agora = LocalDateTime.now();
        return new PropostaResponseDTO(1L, 2L, "comprador-api", "vendedor-api",
                "Tenho interesse", "81999999999", 150.0, 4.0, status, agora, agora);
    }

    @Test
    void criarDevolveCreatedComCorpoRetornadoPeloServico() {
        PropostaCadastroDTO dados = new PropostaCadastroDTO(2L, "Tenho interesse", "81999999999", 150.0, 4.0);
        when(service.criar(dados, "comprador-api")).thenReturn(resposta(StatusPropostaNegociacao.PENDENTE));

        ResponseEntity<PropostaResponseDTO> response = controller.criar(dados, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(StatusPropostaNegociacao.PENDENTE);
        assertThat(response.getBody().valorOfertado()).isEqualTo(150.0);
        assertThat(response.getBody().quantidadeKg()).isEqualTo(4.0);
        verify(service).criar(dados, "comprador-api");
    }

    @Test
    void minhasDelegaOMesmoUsuarioAutenticado() {
        when(service.minhas("comprador-api")).thenReturn(List.of(resposta(StatusPropostaNegociacao.PENDENTE)));

        List<PropostaResponseDTO> response = controller.minhas(authentication);

        assertThat(response).singleElement()
                .satisfies(proposta -> assertThat(proposta.comprador()).isEqualTo("comprador-api"));
        verify(service).minhas("comprador-api");
    }

    @Test
    void recebidasDelegaOMesmoUsuarioAutenticado() {
        when(service.recebidas("comprador-api")).thenReturn(List.of(resposta(StatusPropostaNegociacao.ACEITA)));

        List<PropostaResponseDTO> response = controller.recebidas(authentication);

        assertThat(response).singleElement()
                .satisfies(proposta -> assertThat(proposta.status()).isEqualTo(StatusPropostaNegociacao.ACEITA));
        verify(service).recebidas("comprador-api");
    }

    @Test
    void atualizarStatusRepassaIdEDadosRecebidos() {
        PropostaStatusDTO dados = new PropostaStatusDTO(StatusPropostaNegociacao.RECUSADA);
        when(service.atualizarStatus(3L, dados, "comprador-api"))
                .thenReturn(resposta(StatusPropostaNegociacao.RECUSADA));

        PropostaResponseDTO response = controller.atualizarStatus(3L, dados, authentication);

        assertThat(response.status()).isEqualTo(StatusPropostaNegociacao.RECUSADA);
        verify(service).atualizarStatus(3L, dados, "comprador-api");
    }
}

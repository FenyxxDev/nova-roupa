package br.com.novaroupa.service;

import br.com.novaroupa.dto.PropostaCadastroDTO;
import br.com.novaroupa.dto.PropostaResponseDTO;
import br.com.novaroupa.dto.PropostaStatusDTO;
import br.com.novaroupa.model.LoteRetalho;
import br.com.novaroupa.model.PropostaNegociacao;
import br.com.novaroupa.model.StatusLote;
import br.com.novaroupa.model.StatusPropostaNegociacao;
import br.com.novaroupa.model.TipoPerfil;
import br.com.novaroupa.model.TipoTecido;
import br.com.novaroupa.model.Usuario;
import br.com.novaroupa.repository.LoteRetalhoRepository;
import br.com.novaroupa.repository.PropostaNegociacaoRepository;
import br.com.novaroupa.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PropostaNegociacaoServiceTests {
    @Mock PropostaNegociacaoRepository propostaRepository;
    @Mock LoteRetalhoRepository loteRepository;
    @Mock UsuarioRepository usuarioRepository;
    private PropostaNegociacaoService service;
    private Usuario vendedor;
    private Usuario comprador;
    private LoteRetalho lote;

    @BeforeEach
    void setUp() {
        service = new PropostaNegociacaoService(propostaRepository, loteRepository, usuarioRepository,
                new PropostaValidacaoService());
        vendedor = new Usuario("vendedor-api", TipoPerfil.VENDEDOR);
        comprador = new Usuario("comprador-api", TipoPerfil.COMPRADOR);
        lote = new LoteRetalho(vendedor, TipoTecido.ALGODAO, 10.0, "Azul", "Recife");
        lenient().when(usuarioRepository.findByUsername("comprador-api")).thenReturn(Optional.of(comprador));
        lenient().when(usuarioRepository.findByUsername("vendedor-api")).thenReturn(Optional.of(vendedor));
        lenient().when(propostaRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private PropostaNegociacao propostaPendente() {
        return new PropostaNegociacao(lote, comprador, "Interesse", null, 150.0, 4.0);
    }

    @Test
    void createsProposalForAvailableLot() {
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", "81999999999", 150.0, 4.0);
        when(loteRepository.findById(1L)).thenReturn(Optional.of(lote));
        var response = service.criar(dados, "comprador-api");
        assertThat(response.mensagem()).isEqualTo("Tenho interesse");
        assertThat(response.status()).isEqualTo(StatusPropostaNegociacao.PENDENTE);
        assertThat(response.valorOfertado()).isEqualTo(150.0);
        assertThat(response.quantidadeKg()).isEqualTo(4.0);
    }

    @Test
    void rejectsProposalWhenLotIsUnavailable() {
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", null, 150.0, 4.0);
        lote.setStatus(StatusLote.FINALIZADO);
        when(loteRepository.findById(1L)).thenReturn(Optional.of(lote));
        assertThatThrownBy(() -> service.criar(dados, "comprador-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Lote não está disponível");
    }

    @Test
    void rejectsProposalWhenLotDoesNotExist() {
        PropostaCadastroDTO dados = new PropostaCadastroDTO(99L, "Tenho interesse", null, 150.0, 4.0);
        when(loteRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.criar(dados, "comprador-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Lote não encontrado");
    }

    @Test
    void rejectsProposalFromTheLotOwner() {
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", null, 150.0, 5.0);
        LoteRetalho loteDoProprioComprador = new LoteRetalho(comprador, TipoTecido.ALGODAO, 5.0, "Verde", "Recife");
        when(loteRepository.findById(1L)).thenReturn(Optional.of(loteDoProprioComprador));
        assertThatThrownBy(() -> service.criar(dados, "comprador-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Vendedor não pode propor ao próprio lote");
    }

    @Test
    void rejectsProposalWhenLocalProfileIsMissing() {
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", null, 150.0, 4.0);
        when(usuarioRepository.findByUsername("desaparecido-api")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.criar(dados, "desaparecido-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Perfil local não encontrado");
    }

    @Test
    void rejectsProposalBelowMinimumValueWithoutSaving() {
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", null, 60.0, 4.0);
        lote.setPrecoBaseKg(20.0);
        when(loteRepository.findById(1L)).thenReturn(Optional.of(lote));

        assertThatThrownBy(() -> service.criar(dados, "comprador-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Valor ofertado abaixo de 50% do valor base do lote");
        verify(propostaRepository, never()).save(any());
    }

    @Test
    void rejectsProposalAboveLotWeightWithoutSaving() {
        PropostaCadastroDTO dados = new PropostaCadastroDTO(1L, "Tenho interesse", null, 150.0, 12.0);
        when(loteRepository.findById(1L)).thenReturn(Optional.of(lote));

        assertThatThrownBy(() -> service.criar(dados, "comprador-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Quantidade solicitada excede o peso disponível do lote");
        verify(propostaRepository, never()).save(any());
    }

    @Test
    void listsProposalsSentByTheBuyer() {
        when(propostaRepository.findByComprador(comprador)).thenReturn(List.of(propostaPendente()));
        List<PropostaResponseDTO> response = service.minhas("comprador-api");
        assertThat(response).hasSize(1);
        assertThat(response.get(0).comprador()).isEqualTo("comprador-api");
        assertThat(response.get(0).status()).isEqualTo(StatusPropostaNegociacao.PENDENTE);
    }

    @Test
    void listsProposalsReceivedByTheLotSeller() {
        when(propostaRepository.findByLoteVendedor(vendedor)).thenReturn(List.of(propostaPendente()));
        List<PropostaResponseDTO> response = service.recebidas("vendedor-api");
        assertThat(response).hasSize(1);
        assertThat(response.get(0).vendedor()).isEqualTo("vendedor-api");
    }

    @Test
    void acceptanceFinishesLotAndMarksProposalAccepted() {
        PropostaNegociacao proposta = propostaPendente();
        PropostaStatusDTO dados = new PropostaStatusDTO(StatusPropostaNegociacao.ACEITA);
        when(propostaRepository.findById(1L)).thenReturn(Optional.of(proposta));
        var response = service.atualizarStatus(1L, dados, "vendedor-api");
        assertThat(response.status()).isEqualTo(StatusPropostaNegociacao.ACEITA);
        assertThat(lote.getStatus()).isEqualTo(StatusLote.FINALIZADO);
        verify(loteRepository).save(lote);
    }

    @Test
    void refusalKeepsLotAvailable() {
        PropostaNegociacao proposta = propostaPendente();
        PropostaStatusDTO dados = new PropostaStatusDTO(StatusPropostaNegociacao.RECUSADA);
        when(propostaRepository.findById(1L)).thenReturn(Optional.of(proposta));
        var response = service.atualizarStatus(1L, dados, "vendedor-api");
        assertThat(response.status()).isEqualTo(StatusPropostaNegociacao.RECUSADA);
        assertThat(lote.getStatus()).isEqualTo(StatusLote.DISPONIVEL);
    }

    @Test
    void rejectsDecisionWhenProposalDoesNotExist() {
        PropostaStatusDTO dados = new PropostaStatusDTO(StatusPropostaNegociacao.ACEITA);
        when(propostaRepository.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.atualizarStatus(7L, dados, "vendedor-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Proposta não encontrada");
    }

    @Test
    void rejectsDecisionFromSomeoneOtherThanTheLotSeller() {
        PropostaNegociacao proposta = propostaPendente();
        PropostaStatusDTO dados = new PropostaStatusDTO(StatusPropostaNegociacao.ACEITA);
        when(propostaRepository.findById(1L)).thenReturn(Optional.of(proposta));
        assertThatThrownBy(() -> service.atualizarStatus(1L, dados, "intruso-api"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Somente o vendedor do lote pode decidir a proposta");
    }

    @Test
    void rejectsStatusThatIsNeitherAcceptNorRefuse() {
        PropostaNegociacao proposta = propostaPendente();
        PropostaStatusDTO dados = new PropostaStatusDTO(StatusPropostaNegociacao.PENDENTE);
        when(propostaRepository.findById(1L)).thenReturn(Optional.of(proposta));
        assertThatThrownBy(() -> service.atualizarStatus(1L, dados, "vendedor-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Status deve ser ACEITA ou RECUSADA");
    }

    @Test
    void rejectsSecondDecisionOnAnAlreadyClosedProposal() {
        PropostaNegociacao proposta = propostaPendente();
        proposta.setStatus(StatusPropostaNegociacao.ACEITA);
        PropostaStatusDTO dados = new PropostaStatusDTO(StatusPropostaNegociacao.RECUSADA);
        when(propostaRepository.findById(1L)).thenReturn(Optional.of(proposta));
        assertThatThrownBy(() -> service.atualizarStatus(1L, dados, "vendedor-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Proposta já foi decidida");
    }

    @Test
    void rejectsAcceptanceWhenLotStoppedBeingAvailable() {
        PropostaNegociacao proposta = propostaPendente();
        lote.setStatus(StatusLote.FINALIZADO);
        PropostaStatusDTO dados = new PropostaStatusDTO(StatusPropostaNegociacao.ACEITA);
        when(propostaRepository.findById(1L)).thenReturn(Optional.of(proposta));
        assertThatThrownBy(() -> service.atualizarStatus(1L, dados, "vendedor-api"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Lote não está disponível para venda");
    }
}

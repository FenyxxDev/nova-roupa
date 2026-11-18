import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PropostaModal } from '../../components/proposta-modal/proposta-modal';
import { LoteResponse } from '../../models/lote-response.model';
import {
  LoteNegociavel,
  Proposta,
  StatusProposta,
  classeSeloProposta,
  formatarDataHora,
  formatarReais,
  rotuloStatusProposta,
} from '../../models/proposta.model';
import { AuthService } from '../../services/auth.service';
import { LoteRetalhoService } from '../../services/lote-retalho.service';
import { NotificationService } from '../../services/notification.service';
import { PropostaService } from '../../services/proposta.service';

/** Abas disponíveis na página de propostas. */
export type AbaPropostas = 'recebidas' | 'minhas';

/** Ações de decisão oferecidas ao vendedor. */
export interface AcaoProposta {
  readonly rotulo: string;
  readonly status: StatusProposta;
  readonly classe: string;
}

/**
 * Ações possíveis sobre uma proposta pendente. A API só aceita os estados do
 * enum `StatusPropostaNegociacao`; não existe estado intermédio de
 * "aguardando comprador", pelo que a contraproposta é uma nova proposta.
 */
export const ACOES_PROPOSTA: readonly AcaoProposta[] = [
  { rotulo: 'Aceitar', status: 'ACEITA', classe: 'botao botao--primario' },
  { rotulo: 'Recusar', status: 'RECUSADA', classe: 'botao botao--secundario' },
  { rotulo: 'Concluir', status: 'CONCLUIDA', classe: 'botao botao--secundario' },
  { rotulo: 'Cancelar', status: 'CANCELADA', classe: 'botao botao--discreto' },
];

/**
 * Página de propostas e contrapropostas (issues #33, #48 e #65).
 *
 * Mostra as propostas recebidas (vendedor) e as enviadas (comprador), permite
 * decidir sobre as recebidas com `PATCH /api/propostas/{id}/status` e abrir o
 * modal de contraproposta, que reenvia uma nova proposta para o mesmo lote.
 */
@Component({
  selector: 'app-propostas',
  imports: [PropostaModal],
  templateUrl: './propostas.html',
  styleUrl: './propostas.css',
})
export class Propostas {
  private readonly servico = inject(PropostaService);
  private readonly lotes = inject(LoteRetalhoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly autenticacao = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly acoes = ACOES_PROPOSTA;
  readonly rotuloStatus = rotuloStatusProposta;
  readonly classeSelo = classeSeloProposta;
  readonly formatarReais = formatarReais;
  readonly formatarDataHora = formatarDataHora;

  readonly podeVerRecebidas = computed(() => this.autenticacao.isVendedor());
  readonly podeVerMinhas = computed(() => this.autenticacao.isComprador());

  readonly recebidas = signal<readonly Proposta[]>([]);
  readonly minhas = signal<readonly Proposta[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly aba = signal<AbaPropostas>(this.podeVerRecebidas() ? 'recebidas' : 'minhas');
  readonly loteDoModal = signal<LoteNegociavel | null>(null);
  readonly propostaEmResposta = signal<Proposta | null>(null);

  /** Propostas da aba ativa, para o template não repetir a condição. */
  readonly propostasVisiveis = computed(() =>
    this.aba() === 'recebidas' ? this.recebidas() : this.minhas(),
  );

  constructor() {
    this.carregar();
  }

  /** Carrega as listas a que o utilizador tem acesso. */
  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    let pendentes = 0;

    const concluir = () => {
      pendentes -= 1;
      if (pendentes <= 0) {
        this.carregando.set(false);
      }
    };

    if (this.podeVerRecebidas()) {
      pendentes += 1;
      this.servico
        .recebidas()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (lista) => {
            this.recebidas.set(lista);
            concluir();
          },
          error: (falha: HttpErrorResponse) => {
            this.erro.set(this.mensagemDeErro(falha));
            concluir();
          },
        });
    }

    if (this.podeVerMinhas()) {
      pendentes += 1;
      this.servico
        .minhas()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (lista) => {
            this.minhas.set(lista);
            concluir();
          },
          error: (falha: HttpErrorResponse) => {
            this.erro.set(this.mensagemDeErro(falha));
            concluir();
          },
        });
    }

    if (pendentes === 0) {
      this.carregando.set(false);
    }
  }

  /** Alterna a aba, mantendo o foco no conteúdo principal. */
  selecionarAba(aba: AbaPropostas): void {
    this.aba.set(aba);
  }

  /** Decide uma proposta recebida e atualiza a lista com a resposta da API. */
  responder(proposta: Proposta, status: StatusProposta): void {
    this.servico
      .atualizarStatus(proposta.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (atualizada) => {
          this.recebidas.update((lista) =>
            lista.map((item) => (item.id === atualizada.id ? atualizada : item)),
          );
          this.notificacoes.sucesso(`Proposta #${atualizada.id}: ${rotuloStatusProposta(status)}.`);
        },
        error: (falha: HttpErrorResponse) => {
          this.notificacoes.erro(this.mensagemDeErro(falha));
        },
      });
  }

  /**
   * Abre o modal de contraproposta.
   *
   * A API de propostas só devolve `loteId`; o peso disponível vem de
   * `GET /api/lotes/{id}`, para o modal validar a quantidade pedida.
   */
  contrapor(proposta: Proposta): void {
    this.lotes
      .buscarPorId(proposta.loteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lote: LoteResponse) => {
          this.propostaEmResposta.set(proposta);
          this.loteDoModal.set(lote);
        },
        error: (falha: HttpErrorResponse) => {
          this.notificacoes.erro(this.mensagemDeErro(falha));
        },
      });
  }

  /** Fecha o modal e limpa o contexto da contraproposta. */
  fecharModal(): void {
    this.loteDoModal.set(null);
    this.propostaEmResposta.set(null);
  }

  /** Recarrega as listas depois de uma contraproposta enviada com sucesso. */
  aoEnviarContraproposta(): void {
    this.carregar();
  }

  private mensagemDeErro(falha: HttpErrorResponse): string {
    if (falha.status === 0) {
      return 'Não foi possível contactar o servidor. Verifique a ligação e tente novamente.';
    }
    if (falha.status === 401 || falha.status === 403) {
      return 'A sua sessão não permite ver estas propostas. Entre novamente.';
    }
    return 'Não foi possível obter as propostas agora. Tente novamente em instantes.';
  }
}

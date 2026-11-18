import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { LoteCard } from '../../components/lote-card/lote-card';
import { LoteConsulta } from '../../models/lote-consulta.model';
import { FILTROS_VAZIOS, LoteFiltros } from '../../models/lote-filtros.model';
import { rotuloTecido } from '../../models/lote-rotulos';
import { TipoTecido } from '../../models/tipo-tecido.model';
import { AuthService } from '../../services/auth.service';
import { LoteRetalhoService } from '../../services/lote-retalho.service';
import { NotificationService } from '../../services/notification.service';

/** Debounce dos filtros: evita um pedido por cada tecla escrita na cor/polo. */
export const DEBOUNCE_FILTROS_MS = 300;

/**
 * Vitrine pública de retalhos (issues #42, #44 e #63).
 *
 * Os filtros são um `FormGroup` reativo; cada alteração passa por `debounceTime`
 * e substitui o pedido anterior (`switchMap` implícito no `carregar`), de forma
 * que a grelha atualiza sem recarregar a página. O estado vive em signals para o
 * template reagir sem `async pipe` nem subscrições manuais.
 */
@Component({
  selector: 'app-catalogo',
  imports: [ReactiveFormsModule, LoteCard],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo {
  private readonly servico = inject(LoteRetalhoService);
  private readonly notificacoes = inject(NotificationService);
  private readonly autenticacao = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Opções do seletor de tecido, na ordem do enum do backend. */
  readonly tecidos = Object.values(TipoTecido);
  readonly rotuloTecido = rotuloTecido;

  readonly formulario = new FormGroup({
    tipoTecido: new FormControl<TipoTecido | ''>('', { nonNullable: true }),
    cor: new FormControl('', { nonNullable: true }),
    localizacao: new FormControl('', { nonNullable: true }),
    pesoMin: new FormControl<number | null>(null),
    pesoMax: new FormControl<number | null>(null),
  });

  readonly lotes = signal<readonly LoteConsulta[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly filtros = signal<LoteFiltros>(FILTROS_VAZIOS);

  constructor() {
    this.carregar(0);

    this.formulario.valueChanges
      .pipe(debounceTime(DEBOUNCE_FILTROS_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // `getRawValue()` devolve o formulário completo (e não o `Partial` do
        // `valueChanges`), garantindo que nenhum campo fica indefinido.
        this.filtros.set(this.paraFiltros(this.formulario.getRawValue()));
        this.carregar(0);
      });
  }

  /** Indica se há filtros ativos, para mostrar o botão de limpar. */
  temFiltrosAtivos(): boolean {
    const filtros = this.filtros();
    return (
      filtros.tipoTecido !== null ||
      filtros.cor !== '' ||
      filtros.localizacao !== '' ||
      filtros.pesoMin !== null ||
      filtros.pesoMax !== null
    );
  }

  /** Carrega uma página do catálogo com os filtros atuais. */
  carregar(pagina: number): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.servico
      .buscarLotes(this.filtros(), pagina)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resposta) => {
          this.lotes.set(resposta.content);
          this.total.set(resposta.totalElements);
          this.pagina.set(resposta.number);
          this.totalPaginas.set(resposta.totalPages);
          this.carregando.set(false);
        },
        error: (falha: HttpErrorResponse) => {
          this.lotes.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.erro.set(this.mensagemDeErro(falha));
          this.carregando.set(false);
        },
      });
  }

  /** Repõe os filtros e devolve a vitrine à primeira página. */
  limparFiltros(): void {
    this.formulario.reset({
      tipoTecido: '',
      cor: '',
      localizacao: '',
      pesoMin: null,
      pesoMax: null,
    },
      // `emitEvent: false` evita um segundo pedido depois do debounce: o
      // `carregar(0)` abaixo já recarrega a vitrine sem filtros.
      { emitEvent: false },
    );
    this.filtros.set(FILTROS_VAZIOS);
    this.carregar(0);
  }

  paginaAnterior(): void {
    if (this.pagina() > 0) {
      this.carregar(this.pagina() - 1);
    }
  }

  proximaPagina(): void {
    if (this.pagina() + 1 < this.totalPaginas()) {
      this.carregar(this.pagina() + 1);
    }
  }

  /**
   * Abre o fluxo de proposta para o lote escolhido.
   *
   * Anónimos são encaminhados para o login com `redirect`; com sessão ativa o
   * pedido é confirmado por toast até o modal de propostas chegar (issue #33).
   */
  negociar(lote: LoteConsulta): void {
    if (!this.autenticacao.estaAutenticado()) {
      void this.router.navigate(['/login'], { queryParams: { redirect: '/catalogo' } });
      return;
    }
    this.notificacoes.info(
      `Lote #${lote.id} selecionado. O envio de propostas entra em produção na issue #33.`,
    );
  }

  private paraFiltros(valores: {
    tipoTecido: TipoTecido | '';
    cor: string;
    localizacao: string;
    pesoMin: number | null;
    pesoMax: number | null;
  }): LoteFiltros {
    return {
      tipoTecido: valores.tipoTecido === '' ? null : valores.tipoTecido,
      cor: valores.cor,
      localizacao: valores.localizacao,
      pesoMin: valores.pesoMin,
      pesoMax: valores.pesoMax,
    };
  }

  private mensagemDeErro(falha: HttpErrorResponse): string {
    if (falha.status === 0) {
      return 'Não foi possível contactar o servidor. Verifique a ligação e tente novamente.';
    }
    return 'Não foi possível carregar o catálogo agora. Tente novamente em instantes.';
  }
}

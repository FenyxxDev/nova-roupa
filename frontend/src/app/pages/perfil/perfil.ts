import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AvaliacaoService, AvaliacoesResumo } from '../../services/avaliacao.service';
import {
  Proposta,
  classeSeloProposta,
  formatarDataHora,
  formatarReais,
  rotuloStatusProposta,
} from '../../models/proposta.model';
import { PropostaService } from '../../services/proposta.service';
import { LoteRetalhoService } from '../../services/lote-retalho.service';
import { LoteResponse } from '../../models/lote-response.model';
import { LoteCadastro } from '../../models/lote-cadastro.model';
import { NotificationService } from '../../services/notification.service';

type AbaPerfil = 'negociacoes' | 'lotes';
type FiltroNegociacao = 'ativas' | 'concluidas' | 'todas';

/** Perfil autenticado e histórico com os contratos de API atualmente disponíveis. */
@Component({
  selector: 'app-perfil',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  private readonly autenticacao = inject(AuthService);
  private readonly propostasApi = inject(PropostaService);
  private readonly avaliacoesApi = inject(AvaliacaoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lotesApi = inject(LoteRetalhoService);
  private readonly notificacoes = inject(NotificationService);

  readonly sessao = computed(() => this.autenticacao.sessao());
  readonly username = computed(() => this.sessao()?.username || 'Usuário autenticado');
  readonly papeis = computed(() => this.sessao()?.roles ?? []);
  readonly aba = signal<AbaPerfil>('negociacoes');
  readonly filtro = signal<FiltroNegociacao>('ativas');
  readonly enviadas = signal<readonly Proposta[]>([]);
  readonly recebidas = signal<readonly Proposta[]>([]);
  readonly carregando = signal(true);
  readonly erroMinhas = signal<string | null>(null);
  readonly erroRecebidas = signal<string | null>(null);
  readonly notas = signal<Readonly<Record<number, number>>>({});
  readonly comentarios = signal<Readonly<Record<number, string>>>({});
  readonly avaliacaoAberta = signal<number | null>(null);
  readonly avaliacaoEnviando = signal<number | null>(null);
  readonly avaliadasNestaSessao = signal<readonly number[]>([]);
  readonly resultadoAvaliacao = signal<Readonly<Record<number, string>>>({});
  readonly opcoesNota = [1, 2, 3, 4, 5] as const;
  readonly lotes = signal<readonly LoteResponse[]>([]);
  readonly carregandoLotes = signal(false);
  readonly erroLotes = signal<string | null>(null);
  readonly reputacao = signal<AvaliacoesResumo | null>(null);
  readonly erroReputacao = signal<string | null>(null);
  readonly loteEditando = signal<number | null>(null);
  readonly salvandoLote = signal(false);
  readonly encerrandoLote = signal<number | null>(null);
  readonly edicao = signal<Partial<LoteCadastro>>({});

  /** Combina as propostas autorizadas ao papel da sessão, sem duplicar registros. */
  readonly historico = computed(() => {
    const unicas = new Map<number, Proposta>();
    for (const proposta of [...this.enviadas(), ...this.recebidas()]) {
      unicas.set(proposta.id, proposta);
    }
    return [...unicas.values()].sort(
      (a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime(),
    );
  });
  readonly propostasVisiveis = computed(() => {
    const lista = this.historico();
    if (this.filtro() === 'ativas') {
      return lista.filter((item) => item.status === 'PENDENTE' || item.status === 'ACEITA');
    }
    if (this.filtro() === 'concluidas') {
      return lista.filter((item) => item.status === 'CONCLUIDA');
    }
    return lista;
  });
  readonly negociacoesAtivas = computed(
    () =>
      this.historico().filter((item) => item.status === 'PENDENTE' || item.status === 'ACEITA')
        .length,
  );
  readonly negociacoesConcluidas = computed(
    () => this.historico().filter((item) => item.status === 'CONCLUIDA').length,
  );
  readonly podeVerMinhas = computed(() =>
    this.autenticacao.temRole('ROLE_COMPRADOR', 'ROLE_ADMIN'),
  );
  readonly podeVerRecebidas = computed(() =>
    this.autenticacao.temRole('ROLE_VENDEDOR', 'ROLE_ADMIN'),
  );

  constructor() {
    this.carregar();
    this.carregarReputacao();
    if (this.podeVerRecebidas()) this.carregarLotes();
  }

  carregarReputacao(): void {
    this.erroReputacao.set(null);
    this.avaliacoesApi.minhas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resumo) => this.reputacao.set(resumo),
      error: () => this.erroReputacao.set('Não foi possível carregar sua reputação agora.'),
    });
  }

  carregarLotes(): void {
    this.carregandoLotes.set(true); this.erroLotes.set(null);
    this.lotesApi.meus().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (pagina) => { this.lotes.set(pagina.content); this.carregandoLotes.set(false); },
      error: () => { this.erroLotes.set('Não foi possível carregar seus anúncios.'); this.carregandoLotes.set(false); },
    });
  }

  iniciarEdicao(lote: LoteResponse): void {
    this.loteEditando.set(lote.id);
    this.edicao.set({ tipoTecido: lote.tipoTecido, pesoKg: lote.pesoKg, metragemAproximada: lote.metragemAproximada ?? undefined,
      precoBaseKg: lote.precoBaseKg ?? undefined, corPredominante: lote.corPredominante, descricao: lote.descricao ?? undefined, localizacao: lote.localizacao });
  }

  cancelarEdicao(): void { this.loteEditando.set(null); this.edicao.set({}); }

  alterarEdicao(campo: keyof LoteCadastro, evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.edicao.update((atual) => ({ ...atual, [campo]: ['pesoKg', 'metragemAproximada', 'precoBaseKg'].includes(campo) ? (valor ? Number(valor) : undefined) : valor }));
  }

  salvarEdicao(id: number): void {
    if (this.salvandoLote()) return;
    this.salvandoLote.set(true);
    this.lotesApi.atualizar(id, this.edicao()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lote) => { this.lotes.update((lista) => lista.map((item) => item.id === id ? lote : item)); this.salvandoLote.set(false); this.cancelarEdicao(); this.notificacoes.sucesso('Anúncio atualizado.'); },
      error: () => { this.salvandoLote.set(false); this.notificacoes.erro('Não foi possível atualizar o anúncio.'); },
    });
  }

  encerrarLote(lote: LoteResponse): void {
    if (this.encerrandoLote() !== null || !confirm('Encerrar este anúncio? Essa ação não pode ser desfeita.')) return;
    this.encerrandoLote.set(lote.id);
    this.lotesApi.encerrar(lote.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (atualizado) => { this.lotes.update((lista) => lista.map((item) => item.id === lote.id ? atualizado : item)); this.encerrandoLote.set(null); this.notificacoes.sucesso('Anúncio encerrado.'); },
      error: () => { this.encerrandoLote.set(null); this.notificacoes.erro('Não foi possível encerrar o anúncio.'); },
    });
  }

  carregar(): void {
    this.carregando.set(true);
    this.erroMinhas.set(null);
    this.erroRecebidas.set(null);
    let pendentes = 0;
    const finalizar = () => {
      pendentes -= 1;
      if (pendentes === 0) this.carregando.set(false);
    };

    if (this.podeVerMinhas()) {
      pendentes += 1;
      this.propostasApi
        .minhas()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (lista) => {
            this.enviadas.set(lista);
            finalizar();
          },
          error: (falha: HttpErrorResponse) => {
            this.erroMinhas.set(this.mensagemDeErro(falha));
            finalizar();
          },
        });
    }
    if (this.podeVerRecebidas()) {
      pendentes += 1;
      this.propostasApi
        .recebidas()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (lista) => {
            this.recebidas.set(lista);
            finalizar();
          },
          error: (falha: HttpErrorResponse) => {
            this.erroRecebidas.set(this.mensagemDeErro(falha));
            finalizar();
          },
        });
    }
    if (pendentes === 0) this.carregando.set(false);
  }

  selecionarAba(aba: AbaPerfil): void {
    this.aba.set(aba);
  }

  selecionarFiltro(filtro: FiltroNegociacao): void {
    this.filtro.set(filtro);
  }

  rotuloPapel(papel: string): string {
    const rotulos: Record<string, string> = {
      ROLE_COMPRADOR: 'Comprador',
      ROLE_VENDEDOR: 'Vendedor',
      ROLE_ADMIN: 'Administrador',
    };
    return rotulos[papel] ?? papel.replace(/^ROLE_/, '').toLowerCase();
  }

  nomeParceiro(proposta: Proposta): string {
    const usuario = this.username();
    if (proposta.comprador === usuario) return proposta.vendedor;
    if (proposta.vendedor === usuario) return proposta.comprador;
    return 'Parceiro da negociação';
  }

  direcaoDaProposta(proposta: Proposta): string {
    return proposta.comprador === this.username() ? 'Enviada' : 'Recebida';
  }

  classeSelo(status: string): string {
    return classeSeloProposta(status);
  }

  rotuloStatus(status: string): string {
    return rotuloStatusProposta(status);
  }

  formatarDataHora(data: string | null): string {
    return formatarDataHora(data);
  }

  formatarReais(valor: number): string {
    return formatarReais(valor);
  }

  definirNota(propostaId: number, nota: number): void {
    this.notas.update((atuais) => ({ ...atuais, [propostaId]: nota }));
  }

  definirComentario(propostaId: number, evento: Event): void {
    const campo = evento.target as HTMLTextAreaElement | null;
    this.comentarios.update((atuais) => ({ ...atuais, [propostaId]: campo?.value ?? '' }));
  }

  alternarAvaliacao(propostaId: number): void {
    this.avaliacaoAberta.set(this.avaliacaoAberta() === propostaId ? null : propostaId);
  }

  enviarAvaliacao(proposta: Proposta): void {
    const nota = this.notas()[proposta.id] ?? 0;
    if (
      proposta.status !== 'CONCLUIDA' ||
      nota < 1 ||
      nota > 5 ||
      this.avaliacaoEnviando() !== null
    ) {
      return;
    }
    const comentario = (this.comentarios()[proposta.id] ?? '').trim();
    this.avaliacaoEnviando.set(proposta.id);
    this.avaliacoesApi
      .registrar({ propostaId: proposta.id, nota, comentario: comentario || null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.avaliacaoEnviando.set(null);
          this.avaliadasNestaSessao.update((ids) => [...ids, proposta.id]);
          this.avaliacaoAberta.set(null);
          this.definirResultado(proposta.id, 'Avaliação registrada. Obrigado pelo feedback.');
        },
        error: (falha: HttpErrorResponse) => {
          this.avaliacaoEnviando.set(null);
          const mensagem =
            falha.status === 409
              ? 'Esta negociação já recebeu sua avaliação ou ainda não está disponível para avaliar.'
              : falha.status === 401 || falha.status === 403
                ? 'Sua sessão não permite registrar esta avaliação.'
                : 'Não foi possível registrar a avaliação. Tente novamente mais tarde.';
          this.definirResultado(proposta.id, mensagem);
        },
      });
  }

  jaAvaliadaNestaSessao(propostaId: number): boolean {
    return this.avaliadasNestaSessao().includes(propostaId);
  }

  mensagemResultado(propostaId: number): string | null {
    return this.resultadoAvaliacao()[propostaId] ?? null;
  }

  private definirResultado(propostaId: number, mensagem: string): void {
    this.resultadoAvaliacao.update((atuais) => ({ ...atuais, [propostaId]: mensagem }));
  }

  private mensagemDeErro(falha: HttpErrorResponse): string {
    if (falha.status === 0) {
      return 'Não foi possível contactar o servidor. Verifique a ligação e tente novamente.';
    }
    if (falha.status === 401 || falha.status === 403) {
      return 'Sua sessão não permite consultar este histórico. Entre novamente.';
    }
    return 'Não foi possível obter as negociações agora. Tente novamente em instantes.';
  }
}

import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

/** Categorias semânticas de alerta exibidas pelo componente de toast. */
export type TipoNotificacao = 'sucesso' | 'aviso' | 'erro' | 'info';

/** Alerta ativo exibido no canto da tela. */
export interface Notificacao {
  readonly id: number;
  readonly tipo: TipoNotificacao;
  readonly mensagem: string;
  readonly duracaoMs: number;
}

/** Duração padrão de um toast, em milissegundos (issue #69). */
export const DURACAO_PADRAO_MS = 4000;

/**
 * Centraliza o feedback visual da aplicação.
 *
 * Qualquer serviço ou componente injeta este serviço e chama `sucesso`, `aviso`,
 * `erro` ou `info`; o componente `app-toast`, montado uma única vez no shell,
 * renderiza a lista com `aria-live` e remove cada item após o tempo configurado.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly contador = { valor: 0 };
  private readonly notificacoesSubject = new Subject<Notificacao[]>();
  private readonly _notificacoes = signal<readonly Notificacao[]>([]);
  private readonly temporizadores = new Map<number, ReturnType<typeof setTimeout>>();
  private canalAbort: AbortController | null = null;
  private reconexao: ReturnType<typeof setTimeout> | null = null;

  /** Lista reativa (signals) consumida pelo componente de toast. */
  readonly notificacoes = this._notificacoes.asReadonly();

  /** Lista observável, para consumidores baseados em RxJS. */
  readonly notificacoes$: Observable<Notificacao[]> = this.notificacoesSubject.asObservable();

  conectarTempoReal(): void {
    if (this.canalAbort || typeof fetch === 'undefined') return;
    const token = sessionStorage.getItem('token');
    if (!token) return;
    this.canalAbort = new AbortController();
    void this.escutarCanal(token, this.canalAbort.signal);
  }

  desconectarTempoReal(): void {
    this.canalAbort?.abort();
    this.canalAbort = null;
    if (this.reconexao) clearTimeout(this.reconexao);
    this.reconexao = null;
  }

  sucesso(mensagem: string, duracaoMs = DURACAO_PADRAO_MS): number {
    return this.publicar('sucesso', mensagem, duracaoMs);
  }

  aviso(mensagem: string, duracaoMs = DURACAO_PADRAO_MS): number {
    return this.publicar('aviso', mensagem, duracaoMs);
  }

  erro(mensagem: string, duracaoMs = DURACAO_PADRAO_MS): number {
    return this.publicar('erro', mensagem, duracaoMs);
  }

  info(mensagem: string, duracaoMs = DURACAO_PADRAO_MS): number {
    return this.publicar('info', mensagem, duracaoMs);
  }

  /** Remove um toast imediatamente (botão de dispensar ou fecho automático). */
  dispensar(id: number): void {
    const temporizador = this.temporizadores.get(id);
    if (temporizador) {
      clearTimeout(temporizador);
      this.temporizadores.delete(id);
    }
    const restantes = this._notificacoes().filter((item) => item.id !== id);
    this._notificacoes.set(restantes);
    this.notificacoesSubject.next([...restantes]);
  }

  /** Limpa todos os toasts; usado no logout e nos testes. */
  limpar(): void {
    this.temporizadores.forEach((temporizador) => clearTimeout(temporizador));
    this.temporizadores.clear();
    this._notificacoes.set([]);
    this.notificacoesSubject.next([]);
  }

  private publicar(tipo: TipoNotificacao, mensagem: string, duracaoMs: number): number {
    this.contador.valor += 1;
    const id = this.contador.valor;
    const notificacao: Notificacao = {
      id,
      tipo,
      mensagem,
      duracaoMs: duracaoMs > 0 ? duracaoMs : DURACAO_PADRAO_MS,
    };
    const lista = [...this._notificacoes(), notificacao];
    this._notificacoes.set(lista);
    this.notificacoesSubject.next([...lista]);

    if (notificacao.duracaoMs > 0) {
      this.temporizadores.set(
        id,
        setTimeout(() => this.dispensar(id), notificacao.duracaoMs),
      );
    }
    return id;
  }

  private async escutarCanal(token: string, signal: AbortSignal): Promise<void> {
    try {
      const resposta = await fetch(`${environment.apiUrl}/notificacoes/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal,
      });
      if (!resposta.ok || !resposta.body) throw new Error('stream indisponível');
      const reader = resposta.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!signal.aborted) {
        const parte = await reader.read();
        if (parte.done) break;
        buffer += decoder.decode(parte.value, { stream: true });
        const eventos = buffer.split('\n\n');
        buffer = eventos.pop() ?? '';
        for (const evento of eventos) {
          const linha = evento.split('\n').find((item) => item.startsWith('data:'));
          if (!linha) continue;
          try {
            const payload = JSON.parse(linha.slice(5).trim()) as { mensagem?: string };
            if (payload.mensagem) this.info(payload.mensagem);
          } catch { /* ignora heartbeat ou payload inválido */ }
        }
      }
    } catch { /* abort e indisponibilidade são tratados pela reconexão */ }
    if (!signal.aborted) {
      this.canalAbort = null;
      this.reconexao = setTimeout(() => this.conectarTempoReal(), 5000);
    }
  }
}

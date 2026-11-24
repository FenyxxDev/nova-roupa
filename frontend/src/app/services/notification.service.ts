import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

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

  /** Lista reativa (signals) consumida pelo componente de toast. */
  readonly notificacoes = this._notificacoes.asReadonly();

  /** Lista observável, para consumidores baseados em RxJS. */
  readonly notificacoes$: Observable<Notificacao[]> = this.notificacoesSubject.asObservable();

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
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Dados aceitos por `POST /api/avaliacoes`. */
export interface AvaliacaoCadastro {
  readonly propostaId: number;
  readonly nota: number;
  readonly comentario: string | null;
}

/** Resposta devolvida pelo backend ao registrar a avaliação. */
export interface AvaliacaoResposta {
  readonly id: number;
  readonly propostaId: number;
  readonly avaliadorId: number;
  readonly avaliadoId: number;
  readonly nota: number;
  readonly comentario: string | null;
  readonly dataCriacao: string;
}

/** Integração de avaliações do parceiro, somente para registro. */
@Injectable({ providedIn: 'root' })
export class AvaliacaoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/avaliacoes`;

  /** Registra uma nota de 1 a 5 após a conclusão da proposta. */
  registrar(dados: AvaliacaoCadastro): Observable<AvaliacaoResposta> {
    return this.http.post<AvaliacaoResposta>(this.apiUrl, dados);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Proposta, PropostaCadastro, StatusProposta } from '../models/proposta.model';

/**
 * Acesso à API de propostas de negociação (issues #33, #48 e #65).
 *
 * O backend expõe `POST /api/propostas`, `GET /api/propostas/minhas`,
 * `GET /api/propostas/recebidas` e `PATCH /api/propostas/{id}/status`. Não existe
 * endpoint dedicado a contrapropostas: uma contraproposta é uma nova proposta
 * sobre o mesmo lote, com o novo valor e a justificativa na mensagem.
 */
@Injectable({ providedIn: 'root' })
export class PropostaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/propostas`;

  /** Envia uma proposta (ou contraproposta) para o lote indicado. */
  enviar(dados: PropostaCadastro): Observable<Proposta> {
    return this.http.post<Proposta>(this.apiUrl, dados);
  }

  contraproposta(originalId: number, dados: PropostaCadastro): Observable<Proposta> {
    return this.http.post<Proposta>(`${this.apiUrl}/${originalId}/contrapropostas`, dados);
  }

  /** Propostas enviadas pelo utilizador autenticado (COMPRADOR/ADMIN). */
  minhas(): Observable<Proposta[]> {
    return this.http.get<Proposta[]>(`${this.apiUrl}/minhas`);
  }

  /** Propostas recebidas nos lotes do utilizador (VENDEDOR/ADMIN). */
  recebidas(): Observable<Proposta[]> {
    return this.http.get<Proposta[]>(`${this.apiUrl}/recebidas`);
  }

  /** Decide uma proposta recebida (VENDEDOR/ADMIN). */
  atualizarStatus(id: number, status: StatusProposta): Observable<Proposta> {
    return this.http.patch<Proposta>(`${this.apiUrl}/${id}/status`, { status });
  }
}

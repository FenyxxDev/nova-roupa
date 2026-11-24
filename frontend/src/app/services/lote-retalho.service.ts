import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoteCadastro } from '../models/lote-cadastro.model';
import { LoteConsulta } from '../models/lote-consulta.model';
import { LoteFiltros } from '../models/lote-filtros.model';
import { LoteResponse } from '../models/lote-response.model';
import { Page } from '../models/page.model';

/** Página por omissão da vitrine: 12 cartões enchem a grelha em ecrãs grandes. */
export const TAMANHO_PAGINA_VITRINE = 12;

/**
 * Acesso à API de lotes de retalhos.
 *
 * `buscarLotes` monta a query string apenas com os filtros preenchidos, para que
 * o backend aplique os seus valores por omissão nos restantes campos.
 */
@Injectable({ providedIn: 'root' })
export class LoteRetalhoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/lotes`;

  /** Consulta paginada do catálogo público. */
  listar(page = 0, size = TAMANHO_PAGINA_VITRINE): Observable<Page<LoteConsulta>> {
    return this.http.get<Page<LoteConsulta>>(this.apiUrl, {
      params: { page, size },
    });
  }

  /**
   * Consulta filtrada da vitrine (issues #42 e #44).
   *
   * Filtros vazios não são enviados: `tipoTecido`, `cor`, `localizacao`,
   * `pesoMin` e `pesoMax` só entram na query string quando têm valor.
   */
  buscarLotes(
    filtros: LoteFiltros,
    page = 0,
    size = TAMANHO_PAGINA_VITRINE,
  ): Observable<Page<LoteConsulta>> {
    let params = new HttpParams().set('page', page).set('size', size);

    if (filtros.tipoTecido) {
      params = params.set('tipoTecido', filtros.tipoTecido);
    }
    const cor = filtros.cor.trim();
    if (cor) {
      params = params.set('cor', cor);
    }
    const localizacao = filtros.localizacao.trim();
    if (localizacao) {
      params = params.set('localizacao', localizacao);
    }
    if (filtros.pesoMin !== null) {
      params = params.set('pesoMin', filtros.pesoMin);
    }
    if (filtros.pesoMax !== null) {
      params = params.set('pesoMax', filtros.pesoMax);
    }

    return this.http.get<Page<LoteConsulta>>(this.apiUrl, { params });
  }

  /** Publica um novo lote (VENDEDOR/ADMIN). */
  cadastrar(dados: LoteCadastro): Observable<LoteResponse> {
    return this.http.post<LoteResponse>(this.apiUrl, dados);
  }

  /** Persiste fotos já validadas pela galeria após a criação do lote. */
  enviarFotos(id: number | string, arquivos: readonly File[]): Observable<{ urls: string[] }> {
    const dados = new FormData();
    arquivos.forEach((arquivo) => dados.append('fotos', arquivo, arquivo.name));
    return this.http.post<{ urls: string[] }>(`${this.apiUrl}/${id}/fotos`, dados);
  }

  /** Detalhe de um lote específico. */
  buscarPorId(id: number | string): Observable<LoteResponse> {
    return this.http.get<LoteResponse>(`${this.apiUrl}/${id}`);
  }

  /** Atualiza um lote existente. */
  atualizar(id: number | string, dados: Partial<LoteCadastro>): Observable<LoteResponse> {
    return this.http.put<LoteResponse>(`${this.apiUrl}/${id}`, dados);
  }

  meus(page = 0, size = 12): Observable<Page<LoteResponse>> {
    return this.http.get<Page<LoteResponse>>(`${this.apiUrl}/meus`, { params: { page, size } });
  }

  encerrar(id: number | string): Observable<LoteResponse> {
    return this.http.patch<LoteResponse>(`${this.apiUrl}/${id}/encerrar`, {});
  }

  /** Remove um lote. */
  deletar(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

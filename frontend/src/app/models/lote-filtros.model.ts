import { TipoTecido } from './tipo-tecido.model';

/**
 * Filtros aceites pela consulta pública de lotes (`GET /api/lotes`).
 *
 * O backend recebe apenas os parâmetros preenchidos: tecido, cor, localização e
 * faixa de peso. Campos vazios não viajam na query string, para que a API use os
 * valores por omissão.
 */
export interface LoteFiltros {
  readonly tipoTecido: TipoTecido | null;
  readonly cor: string;
  readonly localizacao: string;
  readonly pesoMin: number | null;
  readonly pesoMax: number | null;
}

/** Estado inicial dos filtros: vitrine sem restrições. */
export const FILTROS_VAZIOS: LoteFiltros = {
  tipoTecido: null,
  cor: '',
  localizacao: '',
  pesoMin: null,
  pesoMax: null,
};

import { StatusLote } from './status-lote.model';
import { TipoTecido } from './tipo-tecido.model';

/** Rótulos legíveis para os tipos de tecido expostos pelo backend. */
const ROTULOS_TECIDO: Record<TipoTecido, string> = {
  [TipoTecido.ALGODAO]: 'Algodão',
  [TipoTecido.JEANS]: 'Jeans',
  [TipoTecido.POLIESTER]: 'Poliéster',
  [TipoTecido.VISCOSE]: 'Viscose',
  [TipoTecido.RETALHOS_MISTOS]: 'Retalhos mistos',
};

/** Rótulos legíveis para o estado de um lote. */
const ROTULOS_STATUS: Record<StatusLote, string> = {
  [StatusLote.DISPONIVEL]: 'Disponível',
  [StatusLote.RESERVADO]: 'Em negociação',
  [StatusLote.DOADO]: 'Doado',
  [StatusLote.FINALIZADO]: 'Finalizado',
};

/** Classe do selo do design system correspondente ao estado do lote. */
const SELOS_STATUS: Record<StatusLote, string> = {
  [StatusLote.DISPONIVEL]: 'selo selo--sucesso',
  [StatusLote.RESERVADO]: 'selo selo--aviso',
  [StatusLote.DOADO]: 'selo selo--info',
  [StatusLote.FINALIZADO]: 'selo selo--neutro',
};

/** Converte o enum de tecido num rótulo com acentuação correta. */
export function rotuloTecido(tipo: TipoTecido | string): string {
  return ROTULOS_TECIDO[tipo as TipoTecido] ?? String(tipo);
}

/** Converte o enum de estado num rótulo legível. */
export function rotuloStatus(status: StatusLote | string): string {
  return ROTULOS_STATUS[status as StatusLote] ?? String(status);
}

/** Devolve as classes CSS do selo adequado ao estado do lote. */
export function classeSeloStatus(status: StatusLote | string): string {
  return SELOS_STATUS[status as StatusLote] ?? 'selo selo--neutro';
}

/**
 * Extrai a primeira imagem de `fotosUrls`.
 *
 * O backend guarda as fotos como texto separado por vírgulas ou ponto e vírgula,
 * portanto a vitrine usa apenas a primeira como capa do cartão.
 */
export function primeiraFoto(fotosUrls: string | null): string | null {
  if (!fotosUrls) {
    return null;
  }
  const [primeira] = fotosUrls.split(/[,;]/).map((url) => url.trim()).filter(Boolean);
  return primeira ?? null;
}

/** Formata a data de publicação no padrão brasileiro (dd/mm/aaaa). */
export function formatarData(dataPublicacao: string | null): string {
  if (!dataPublicacao) {
    return '—';
  }
  const data = new Date(dataPublicacao);
  if (Number.isNaN(data.getTime())) {
    return '—';
  }
  return data.toLocaleDateString('pt-BR');
}

/** Formata peso em quilogramas com uma casa decimal e unidade. */
export function formatarPeso(pesoKg: number | null): string {
  if (pesoKg === null || Number.isNaN(pesoKg)) {
    return '—';
  }
  return `${pesoKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
}

/**
 * Estados do ciclo de vida de uma proposta, iguais ao enum
 * `StatusPropostaNegociacao` do backend (issues #33, #48 e #65).
 */
export type StatusProposta = 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CONCLUIDA' | 'CANCELADA';

/** Ordem usada nos seletores e nas legendas de estado. */
export const STATUS_PROPOSTA: readonly StatusProposta[] = [
  'PENDENTE',
  'ACEITA',
  'RECUSADA',
  'CONCLUIDA',
  'CANCELADA',
];

/** Proposta devolvida por `GET /api/propostas/minhas` e `/recebidas`. */
export interface Proposta {
  readonly id: number;
  readonly loteId: number;
  readonly comprador: string;
  readonly vendedor: string;
  readonly mensagem: string;
  readonly telefoneContato: string | null;
  readonly valorOfertado: number;
  readonly quantidadeKg: number;
  readonly status: StatusProposta;
  readonly dataCriacao: string;
  readonly dataAtualizacao: string | null;
}

/** Corpo aceito por `POST /api/propostas` (`PropostaCadastroDTO`). */
export interface PropostaCadastro {
  readonly loteId: number;
  readonly mensagem: string;
  readonly telefoneContato?: string;
  readonly valorOfertado: number;
  readonly quantidadeKgSolicitada: number;
}

/** Lote reduzido ao que o modal de proposta precisa de mostrar. */
export interface LoteNegociavel {
  readonly id: number;
  readonly tipoTecido: string;
  readonly pesoKg: number;
  readonly corPredominante: string;
}

const ROTULOS_STATUS: Record<StatusProposta, string> = {
  PENDENTE: 'Pendente',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const SELOS_STATUS: Record<StatusProposta, string> = {
  PENDENTE: 'selo selo--aviso',
  ACEITA: 'selo selo--sucesso',
  RECUSADA: 'selo selo--erro',
  CONCLUIDA: 'selo selo--info',
  CANCELADA: 'selo selo--neutro',
};

/** Rótulo legível de um estado de proposta. */
export function rotuloStatusProposta(status: StatusProposta | string): string {
  return ROTULOS_STATUS[status as StatusProposta] ?? String(status);
}

/** Classes do selo do design system correspondentes ao estado. */
export function classeSeloProposta(status: StatusProposta | string): string {
  return SELOS_STATUS[status as StatusProposta] ?? 'selo selo--neutro';
}

/** Formata um valor em reais com duas casas decimais (ex.: `R$ 12,00`). */
export function formatarReais(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return '—';
  }
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata a data (e hora, quando existir) no padrão brasileiro. */
export function formatarDataHora(data: string | null): string {
  if (!data) {
    return '—';
  }
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) {
    return '—';
  }
  return valor.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

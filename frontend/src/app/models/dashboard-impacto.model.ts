export interface DashboardImpacto {
  retalhosReaproveitadosKg: number;
  co2EvitadoKg: number;
  lotesNegociados: number;
  parceirosAtivos: number;
  categorias?: ReadonlyArray<{ categoria: string; quantidadeKg: number }>;
}

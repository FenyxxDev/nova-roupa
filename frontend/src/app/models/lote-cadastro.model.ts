import { TipoTecido } from './tipo-tecido.model';

export interface LoteCadastro {
  tipoTecido: TipoTecido;
  pesoKg: number;
  metragemAproximada?: number;
  /**
   * Preço base por quilo, opcional no backend (`@Positive`).
   *
   * O cadastro público (`LoteConsultaDTO`) não devolve este valor, por isso a
   * vitrine não o mostra; o campo existe para o formulário de publicação
   * (issues #31, #47 e #64) ficar alinhado com `LoteCadastroDTO`.
   */
  precoBaseKg?: number;
  corPredominante: string;
  descricao?: string;
  fotosUrls?: string;
  localizacao: string;
}

import { Component, computed, input, output } from '@angular/core';
import { LoteConsulta } from '../../models/lote-consulta.model';
import { StatusLote } from '../../models/status-lote.model';
import {
  classeSeloStatus,
  formatarData,
  formatarPeso,
  primeiraFoto,
  rotuloStatus,
  rotuloTecido,
} from '../../models/lote-rotulos';

/**
 * Cartão da vitrine de lotes (issues #42, #44 e #63).
 *
 * Recebe o lote já carregado e emite `negociar` quando o utilizador pede para
 * abrir o fluxo de proposta; toda a lógica de navegação/permissão fica na
 * página, mantendo o cartão sem dependências de serviços.
 */
@Component({
  selector: 'app-lote-card',
  templateUrl: './lote-card.html',
  styleUrl: './lote-card.css',
})
export class LoteCard {
  readonly lote = input.required<LoteConsulta>();
  readonly negociar = output<LoteConsulta>();

  readonly foto = computed(() => primeiraFoto(this.lote().fotosUrls));
  readonly tecido = computed(() => rotuloTecido(this.lote().tipoTecido));
  readonly status = computed(() => rotuloStatus(this.lote().status));
  readonly classeStatus = computed(() => classeSeloStatus(this.lote().status));
  readonly peso = computed(() => formatarPeso(this.lote().pesoKg));
  readonly publicacao = computed(() => formatarData(this.lote().dataPublicacao));
  readonly metragem = computed(() => {
    const metragem = this.lote().metragemAproximada;
    if (metragem === null) {
      return '—';
    }
    return `${metragem.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m`;
  });
  readonly podeNegociar = computed(() => this.lote().status === StatusLote.DISPONIVEL);

  solicitarNegociacao(): void {
    this.negociar.emit(this.lote());
  }
}

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { LoteNegociavel, Proposta } from '../../models/proposta.model';
import { PropostaModal } from './proposta-modal';

const URL_PROPOSTAS = `${environment.apiUrl}/propostas`;

const LOTE: LoteNegociavel = {
  id: 7,
  tipoTecido: 'JEANS',
  pesoKg: 20,
  corPredominante: 'azul',
};

function proposta(parcial: Partial<Proposta> = {}): Proposta {
  return {
    id: 3,
    loteId: 7,
    comprador: 'comprador',
    vendedor: 'vendedor',
    mensagem: 'Tenho interesse.',
    telefoneContato: null,
    valorOfertado: 12,
    quantidadeKg: 5,
    status: 'PENDENTE',
    dataCriacao: '2026-11-18T10:00:00',
    dataAtualizacao: null,
    ...parcial,
  };
}

describe('PropostaModal', () => {
  let httpMock: HttpTestingController;

  function criar(original: Proposta | null = null): ComponentFixture<PropostaModal> {
    const fixture = TestBed.createComponent(PropostaModal);
    fixture.componentRef.setInput('lote', LOTE);
    fixture.componentRef.setInput('propostaOriginal', original);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropostaModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('não envia quando o formulário está vazio e marca os campos', () => {
    const fixture = criar();
    const modal = fixture.componentInstance;

    modal.enviar();

    expect(httpMock.match(URL_PROPOSTAS).length).toBe(0);
    expect(modal.erro()).toContain('Revise os campos');
    expect(modal.formulario.controls.valorOfertado.touched).toBe(true);
  });

  it('recusa quantidade superior ao peso disponível no lote', () => {
    const fixture = criar();
    const modal = fixture.componentInstance;

    modal.formulario.setValue({
      valorOfertado: 12,
      quantidadeKgSolicitada: 25,
      mensagem: 'Quero 25 kg deste lote.',
      telefoneContato: '',
    });

    expect(modal.formulario.controls.quantidadeKgSolicitada.hasError('max')).toBe(true);
    expect(modal.formulario.invalid).toBe(true);
  });

  it('envia o payload exato e emite enviada e fechar', () => {
    const fixture = criar();
    const modal = fixture.componentInstance;
    const enviada = vi.fn();
    const fechar = vi.fn();
    modal.enviada.subscribe(enviada);
    modal.fechar.subscribe(fechar);

    modal.formulario.setValue({
      valorOfertado: 12.5,
      quantidadeKgSolicitada: 4,
      mensagem: '  Tenho interesse no lote.  ',
      telefoneContato: '  ',
    });
    modal.enviar();

    const pedido = httpMock.expectOne(URL_PROPOSTAS);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({
      loteId: 7,
      mensagem: 'Tenho interesse no lote.',
      valorOfertado: 12.5,
      quantidadeKgSolicitada: 4,
    });
    pedido.flush(proposta());

    expect(enviada).toHaveBeenCalledTimes(1);
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it('abre em modo contraproposta e pré-preenche a oferta atual', () => {
    const fixture = criar(proposta({ valorOfertado: 12, quantidadeKg: 6 }));
    const modal = fixture.componentInstance;

    expect(modal.modo()).toBe('contraproposta');
    expect(modal.formulario.controls.valorOfertado.value).toBe(12);
    expect(modal.formulario.controls.quantidadeKgSolicitada.value).toBe(6);
  });

  it('mostra mensagem própria para 400 do backend', () => {
    const fixture = criar();
    const modal = fixture.componentInstance;
    modal.formulario.setValue({
      valorOfertado: 10,
      quantidadeKgSolicitada: 2,
      mensagem: 'Proposta de teste.',
      telefoneContato: '',
    });

    modal.enviar();
    httpMock.expectOne(URL_PROPOSTAS).flush({}, { status: 400, statusText: 'Bad Request' });

    expect(modal.erro()).toContain('recusou os dados');
    expect(modal.enviando()).toBe(false);
  });

  it('fecha ao pressionar Esc', () => {
    const fixture = criar();
    const fechar = vi.fn();
    fixture.componentInstance.fechar.subscribe(fechar);

    fixture.componentInstance.aoPressionarEsc();

    expect(fechar).toHaveBeenCalledTimes(1);
  });
});

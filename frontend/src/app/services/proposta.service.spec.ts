import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Proposta } from '../models/proposta.model';
import { PropostaService } from './proposta.service';

const URL_PROPOSTAS = `${environment.apiUrl}/propostas`;

const RESPOSTA: Proposta = {
  id: 1,
  loteId: 2,
  comprador: 'comprador',
  vendedor: 'vendedor',
  mensagem: 'Proposta de teste.',
  telefoneContato: null,
  valorOfertado: 10,
  quantidadeKg: 5,
  status: 'PENDENTE',
  dataCriacao: '2026-11-18T09:00:00',
  dataAtualizacao: null,
};

describe('PropostaService', () => {
  let servico: PropostaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(PropostaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('envia a proposta com o payload do DTO do backend', () => {
    let resultado: Proposta | undefined;
    servico
      .enviar({
        loteId: 2,
        mensagem: 'Proposta de teste.',
        valorOfertado: 10,
        quantidadeKgSolicitada: 5,
      })
      .subscribe((proposta) => (resultado = proposta));

    const pedido = httpMock.expectOne(URL_PROPOSTAS);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({
      loteId: 2,
      mensagem: 'Proposta de teste.',
      valorOfertado: 10,
      quantidadeKgSolicitada: 5,
    });
    pedido.flush(RESPOSTA);

    expect(resultado?.id).toBe(1);
  });

  it('lista as propostas enviadas em /minhas', () => {
    let total = 0;
    servico.minhas().subscribe((lista) => (total = lista.length));

    const pedido = httpMock.expectOne(`${URL_PROPOSTAS}/minhas`);
    expect(pedido.request.method).toBe('GET');
    pedido.flush([RESPOSTA]);

    expect(total).toBe(1);
  });

  it('lista as propostas recebidas em /recebidas', () => {
    let total = 0;
    servico.recebidas().subscribe((lista) => (total = lista.length));

    const pedido = httpMock.expectOne(`${URL_PROPOSTAS}/recebidas`);
    expect(pedido.request.method).toBe('GET');
    pedido.flush([RESPOSTA, { ...RESPOSTA, id: 2 }]);

    expect(total).toBe(2);
  });

  it('atualiza o estado com PATCH /{id}/status', () => {
    let status = '';
    servico
      .atualizarStatus(1, 'ACEITA')
      .subscribe((proposta) => (status = proposta.status));

    const pedido = httpMock.expectOne(`${URL_PROPOSTAS}/1/status`);
    expect(pedido.request.method).toBe('PATCH');
    expect(pedido.request.body).toEqual({ status: 'ACEITA' });
    pedido.flush({ ...RESPOSTA, status: 'ACEITA' });

    expect(status).toBe('ACEITA');
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { LoteResponse } from '../../models/lote-response.model';
import { StatusLote } from '../../models/status-lote.model';
import { TipoTecido } from '../../models/tipo-tecido.model';
import { LoteCadastro } from './lote-cadastro';

const URL_LOTES = `${environment.apiUrl}/lotes`;

function resposta(id = 7): LoteResponse {
  return {
    id,
    vendedor: 'vendedor',
    tipoTecido: TipoTecido.JEANS,
    pesoKg: 12,
    metragemAproximada: 8,
    corPredominante: 'azul índigo',
    descricao: null,
    fotosUrls: null,
    localizacao: 'São Paulo',
    status: StatusLote.DISPONIVEL,
    dataPublicacao: '2026-11-18T10:00:00',
  };
}

describe('LoteCadastro', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoteCadastro],
      providers: [
        provideRouter([
          { path: 'catalogo', children: [] },
          { path: 'lotes/novo', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  /** Preenche os campos obrigatórios com valores válidos. */
  function preencherValido(componente: LoteCadastro): void {
    componente.formulario.setValue({
      tipoTecido: TipoTecido.JEANS,
      pesoKg: 12,
      metragemAproximada: 8,
      precoBaseKg: 9.5,
      corPredominante: 'azul índigo',
      descricao: 'Retalhos com pequenas manchas.',
      localizacao: 'São Paulo',
    });
  }

  it('não envia um formulário vazio e mostra as mensagens de validação', () => {
    const fixture = TestBed.createComponent(LoteCadastro);
    const componente = fixture.componentInstance;

    componente.enviar();
    fixture.detectChanges();

    httpMock.expectNone(URL_LOTES);
    expect(componente.formulario.invalid).toBe(true);
    expect(componente.campoInvalido('tipoTecido')).toBe(true);
    expect(componente.campoInvalido('pesoKg')).toBe(true);
    expect(componente.campoInvalido('corPredominante')).toBe(true);
    expect(componente.campoInvalido('localizacao')).toBe(true);
  });

  it('recusa peso abaixo de 1 kg', () => {
    const fixture = TestBed.createComponent(LoteCadastro);
    const componente = fixture.componentInstance;

    preencherValido(componente);
    componente.formulario.controls.pesoKg.setValue(0.5);
    componente.enviar();

    httpMock.expectNone(URL_LOTES);
    expect(componente.formulario.controls.pesoKg.hasError('min')).toBe(true);
  });

  it('publica o lote e redireciona para a vitrine', () => {
    const fixture = TestBed.createComponent(LoteCadastro);
    const componente = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    preencherValido(componente);
    componente.enviar();

    const pedido = httpMock.expectOne(URL_LOTES);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({
      tipoTecido: TipoTecido.JEANS,
      pesoKg: 12,
      metragemAproximada: 8,
      precoBaseKg: 9.5,
      corPredominante: 'azul índigo',
      descricao: 'Retalhos com pequenas manchas.',
      localizacao: 'São Paulo',
    });
    pedido.flush(resposta());

    expect(componente.enviando()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/catalogo']);
  });

  it('mostra mensagem de erro quando o backend recusa os dados', () => {
    const fixture = TestBed.createComponent(LoteCadastro);
    const componente = fixture.componentInstance;

    preencherValido(componente);
    componente.enviar();
    httpMock
      .expectOne(URL_LOTES)
      .flush({ message: 'inválido' }, { status: 400, statusText: 'Bad Request' });

    expect(componente.enviando()).toBe(false);
    expect(componente.erroEnvio()).toContain('recusou os dados');
  });

  it('omite campos opcionais vazios do payload', () => {
    const fixture = TestBed.createComponent(LoteCadastro);
    const componente = fixture.componentInstance;

    componente.formulario.setValue({
      tipoTecido: TipoTecido.ALGODAO,
      pesoKg: 5,
      metragemAproximada: null,
      precoBaseKg: null,
      corPredominante: 'branco',
      descricao: '   ',
      localizacao: 'Recife',
    });
    componente.enviar();

    const pedido = httpMock.expectOne(URL_LOTES);
    expect(pedido.request.body.metragemAproximada).toBeUndefined();
    expect(pedido.request.body.precoBaseKg).toBeUndefined();
    expect(pedido.request.body.descricao).toBeUndefined();
    pedido.flush(resposta());
  });
});

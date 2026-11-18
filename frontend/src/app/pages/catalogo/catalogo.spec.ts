import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { LoteConsulta } from '../../models/lote-consulta.model';
import {
  classeSeloStatus,
  formatarPeso,
  primeiraFoto,
  rotuloStatus,
  rotuloTecido,
} from '../../models/lote-rotulos';
import { StatusLote } from '../../models/status-lote.model';
import { TipoTecido } from '../../models/tipo-tecido.model';
import { Catalogo, DEBOUNCE_FILTROS_MS } from './catalogo';

const URL_LOTES = `${environment.apiUrl}/lotes`;

function lote(id: number, tipoTecido: TipoTecido, status = StatusLote.DISPONIVEL): LoteConsulta {
  return {
    id,
    tipoTecido,
    pesoKg: 12.5,
    metragemAproximada: 8,
    corPredominante: 'azul',
    descricao: 'Retalho de jeans com pequenas manchas.',
    fotosUrls: null,
    localizacao: 'São Paulo',
    status,
    dataPublicacao: '2026-11-01T10:00:00',
  };
}

function pagina(
  content: LoteConsulta[],
  number = 0,
  totalPages = 1,
  totalElements = content.length,
) {
  return { content, totalElements, totalPages, number, size: 12 };
}

/** Aguarda o debounce dos filtros antes de procurar o pedido HTTP. */
function esperaDebounce(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, DEBOUNCE_FILTROS_MS + 80));
}

describe('Catalogo', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Catalogo],
      providers: [
        provideRouter([
          { path: 'login', children: [] },
          { path: 'catalogo', children: [] },
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

  it('carrega a primeira página sem filtros ao arrancar', () => {
    const fixture = TestBed.createComponent(Catalogo);
    const componente = fixture.componentInstance;

    const pedido = httpMock.expectOne((r) => r.url === URL_LOTES);
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.get('page')).toBe('0');
    expect(pedido.request.params.get('size')).toBe('12');
    expect(pedido.request.params.has('tipoTecido')).toBe(false);
    expect(pedido.request.params.has('cor')).toBe(false);

    pedido.flush(pagina([lote(1, TipoTecido.JEANS), lote(2, TipoTecido.ALGODAO)], 0, 1, 2));
    fixture.detectChanges();

    expect(componente.lotes().length).toBe(2);
    expect(componente.total()).toBe(2);
    expect(componente.carregando()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('app-lote-card').length).toBe(2);
  });

  it('envia tecido e polo como parâmetros depois do debounce', async () => {
    const fixture = TestBed.createComponent(Catalogo);
    httpMock.expectOne((r) => r.url === URL_LOTES).flush(pagina([], 0, 0, 0));

    const componente = fixture.componentInstance;
    componente.formulario.patchValue({
      tipoTecido: TipoTecido.JEANS,
      localizacao: 'São Paulo',
    });

    await esperaDebounce();

    const pedido = httpMock.expectOne((r) => r.url === URL_LOTES);
    expect(pedido.request.params.get('tipoTecido')).toBe('JEANS');
    expect(pedido.request.params.get('localizacao')).toBe('São Paulo');

    pedido.flush(pagina([lote(3, TipoTecido.JEANS)], 0, 1, 1));
    expect(componente.lotes().length).toBe(1);
    expect(componente.temFiltrosAtivos()).toBe(true);
  });

  it('mostra o estado vazio e repõe os filtros ao limpar', async () => {
    const fixture = TestBed.createComponent(Catalogo);
    httpMock.expectOne((r) => r.url === URL_LOTES).flush(pagina([], 0, 0, 0));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum lote encontrado');

    fixture.componentInstance.formulario.patchValue({ cor: 'azul' });
    await esperaDebounce();
    httpMock.expectOne((r) => r.url === URL_LOTES && r.params.get('cor') === 'azul')
      .flush(pagina([], 0, 0, 0));

    fixture.componentInstance.limparFiltros();
    const semFiltros = httpMock.expectOne((r) => r.url === URL_LOTES);
    expect(semFiltros.request.params.has('cor')).toBe(false);
    semFiltros.flush(pagina([lote(1, TipoTecido.JEANS)], 0, 1, 1));

    fixture.detectChanges();
    expect(fixture.componentInstance.total()).toBe(1);
    expect(fixture.componentInstance.temFiltrosAtivos()).toBe(false);
  });

  it('expõe o erro da API como aviso acessível', () => {
    const fixture = TestBed.createComponent(Catalogo);
    httpMock
      .expectOne((r) => r.url === URL_LOTES)
      .flush({ mensagem: 'falha' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.erro()).toContain('Não foi possível carregar o catálogo');
    const aviso = fixture.nativeElement.querySelector('.aviso--erro');
    expect(aviso).toBeTruthy();
    expect(aviso.getAttribute('role')).toBe('alert');
  });

  it('pagina mantendo os filtros aplicados', () => {
    const fixture = TestBed.createComponent(Catalogo);
    httpMock
      .expectOne((r) => r.url === URL_LOTES)
      .flush(pagina([lote(1, TipoTecido.JEANS)], 0, 2, 3));

    const componente = fixture.componentInstance;
    expect(componente.totalPaginas()).toBe(2);

    componente.proximaPagina();
    const pedido = httpMock.expectOne((r) => r.url === URL_LOTES);
    expect(pedido.request.params.get('page')).toBe('1');
    pedido.flush(pagina([lote(2, TipoTecido.ALGODAO)], 1, 2, 3));

    expect(componente.pagina()).toBe(1);
  });

  it('encaminha utilizadores anónimos para o login ao negociar', () => {
    const fixture = TestBed.createComponent(Catalogo);
    httpMock
      .expectOne((r) => r.url === URL_LOTES)
      .flush(pagina([lote(1, TipoTecido.JEANS)], 0, 1, 1));

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.negociar(lote(1, TipoTecido.JEANS));

    expect(navegar).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/catalogo' },
    });
  });
});

describe('rótulos de lote', () => {
  it('traduz tecido e estado para português', () => {
    expect(rotuloTecido(TipoTecido.RETALHOS_MISTOS)).toBe('Retalhos mistos');
    expect(rotuloStatus(StatusLote.RESERVADO)).toBe('Em negociação');
  });

  it('associa o selo ao estado do lote', () => {
    expect(classeSeloStatus(StatusLote.DISPONIVEL)).toContain('selo--sucesso');
    expect(classeSeloStatus(StatusLote.RESERVADO)).toContain('selo--aviso');
  });

  it('extrai a primeira foto e formata o peso', () => {
    expect(primeiraFoto(null)).toBeNull();
    expect(primeiraFoto(' https://a/1.jpg , https://a/2.jpg ')).toBe('https://a/1.jpg');
    expect(formatarPeso(12.5)).toContain('kg');
    expect(formatarPeso(null)).toBe('—');
  });
});

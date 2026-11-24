import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AvaliacaoService } from './avaliacao.service';

describe('AvaliacaoService', () => {
  let servico: AvaliacaoService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/avaliacoes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(AvaliacaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('registra uma avaliação com o payload aceito pelo backend', () => {
    let id = 0;
    servico
      .registrar({ propostaId: 9, nota: 4, comentario: 'Ótima negociação.' })
      .subscribe((resposta) => {
        id = resposta.id;
      });

    const pedido = httpMock.expectOne(url);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({
      propostaId: 9,
      nota: 4,
      comentario: 'Ótima negociação.',
    });
    pedido.flush({
      id: 6,
      propostaId: 9,
      avaliadorId: 1,
      avaliadoId: 2,
      nota: 4,
      comentario: 'Ótima negociação.',
      dataCriacao: '2026-11-18T10:00:00',
    });
    expect(id).toBe(6);
  });

  it('permite registrar sem comentário', () => {
    servico.registrar({ propostaId: 9, nota: 5, comentario: null }).subscribe();
    const pedido = httpMock.expectOne(url);
    expect(pedido.request.body).toEqual({ propostaId: 9, nota: 5, comentario: null });
    pedido.flush({
      id: 7,
      propostaId: 9,
      avaliadorId: 1,
      avaliadoId: 2,
      nota: 5,
      comentario: null,
      dataCriacao: '2026-11-18T10:00:00',
    });
  });
});

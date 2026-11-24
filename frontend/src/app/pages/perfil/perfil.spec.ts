import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Proposta } from '../../models/proposta.model';
import { Perfil } from './perfil';

const URL_PROPOSTAS = `${environment.apiUrl}/propostas`;
const URL_AVALIACOES = `${environment.apiUrl}/avaliacoes`;

function proposta(parcial: Partial<Proposta> = {}): Proposta {
  return {
    id: 12,
    loteId: 4,
    comprador: 'comprador-demo',
    vendedor: 'vendedor-demo',
    mensagem: 'Tenho interesse neste lote.',
    telefoneContato: null,
    valorOfertado: 15,
    quantidadeKg: 8,
    status: 'PENDENTE',
    dataCriacao: '2026-11-18T09:00:00',
    dataAtualizacao: null,
    ...parcial,
  };
}

function iniciarSessao(roles: string[], username = 'comprador-demo'): void {
  sessionStorage.setItem('token', 'token-de-teste');
  sessionStorage.setItem('usuarioLogado', username);
  sessionStorage.setItem('roles', JSON.stringify(roles));
}

describe('Perfil', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.match(`${environment.apiUrl}/lotes/meus?page=0&size=12`).forEach((request) =>
      request.flush({ content: [], totalElements: 0, totalPages: 0, size: 12, number: 0 }),
    );
    httpMock.verify();
    sessionStorage.clear();
  });

  it('mostra os dados disponíveis na sessão e carrega o histórico enviado do comprador', () => {
    iniciarSessao(['ROLE_COMPRADOR']);
    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    httpMock.expectOne(`${URL_PROPOSTAS}/minhas`).flush([proposta()]);
    fixture.detectChanges();

    expect(httpMock.match(`${URL_PROPOSTAS}/recebidas`).length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('comprador-demo');
    expect(fixture.nativeElement.textContent).toContain('Comprador');
    expect(fixture.nativeElement.textContent).toContain('Negociação com vendedor-demo');
    expect(fixture.componentInstance.negociacoesAtivas()).toBe(1);
  });

  it('carrega propostas recebidas e permite abrir avaliação apenas em negociação concluída', () => {
    iniciarSessao(['ROLE_VENDEDOR'], 'vendedor-demo');
    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    httpMock.expectOne(`${URL_PROPOSTAS}/recebidas`).flush([proposta({ status: 'CONCLUIDA' })]);
    fixture.componentInstance.selecionarFiltro('concluidas');
    fixture.detectChanges();

    expect(httpMock.match(`${URL_PROPOSTAS}/minhas`).length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Negociação com comprador-demo');
    expect(fixture.nativeElement.textContent).toContain('Avaliar parceria');
    expect(fixture.componentInstance.negociacoesConcluidas()).toBe(1);
  });

  it('combina as propostas enviadas e recebidas para administrador sem duplicar IDs', () => {
    iniciarSessao(['ROLE_ADMIN'], 'comprador-demo');
    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    httpMock.expectOne(`${URL_PROPOSTAS}/minhas`).flush([proposta()]);
    httpMock
      .expectOne(`${URL_PROPOSTAS}/recebidas`)
      .flush([
        proposta({ id: 13, status: 'ACEITA', vendedor: 'outro-vendedor' }),
        proposta({ id: 12, status: 'PENDENTE' }),
      ]);

    expect(fixture.componentInstance.historico().map((item) => item.id)).toEqual([12, 13]);
    expect(fixture.componentInstance.historico()).toHaveLength(2);
  });

  it('carrega os lotes próprios sem consultar o catálogo público', () => {
    iniciarSessao(['ROLE_VENDEDOR'], 'vendedor-demo');
    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();
    httpMock.expectOne(`${URL_PROPOSTAS}/recebidas`).flush([]);

    fixture.componentInstance.selecionarAba('lotes');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Meus lotes anunciados');
    expect(fixture.nativeElement.textContent).toContain('Carregando seus anúncios');
    expect(httpMock.match(`${environment.apiUrl}/lotes`).length).toBe(0);
  });

  it('registra avaliação de 1 a 5 estrelas para negociação concluída', () => {
    iniciarSessao(['ROLE_COMPRADOR']);
    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();
    const concluida = proposta({ status: 'CONCLUIDA' });
    httpMock.expectOne(`${URL_PROPOSTAS}/minhas`).flush([concluida]);

    fixture.componentInstance.definirNota(concluida.id, 5);
    fixture.componentInstance.definirComentario(concluida.id, {
      target: { value: 'Boa comunicação.' },
    } as unknown as Event);
    fixture.componentInstance.enviarAvaliacao(concluida);

    const pedido = httpMock.expectOne(URL_AVALIACOES);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({
      propostaId: 12,
      nota: 5,
      comentario: 'Boa comunicação.',
    });
    pedido.flush({
      id: 30,
      propostaId: 12,
      avaliadorId: 2,
      avaliadoId: 3,
      nota: 5,
      comentario: 'Boa comunicação.',
      dataCriacao: '2026-11-18T10:00:00',
    });

    expect(fixture.componentInstance.jaAvaliadaNestaSessao(12)).toBe(true);
    expect(fixture.componentInstance.mensagemResultado(12)).toContain('Avaliação registrada');
  });

  it('não apresenta uma reputação inventada quando a API não fornece leitura de feedbacks', () => {
    iniciarSessao(['ROLE_COMPRADOR']);
    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();
    httpMock.expectOne(`${URL_PROPOSTAS}/minhas`).flush([]);

    expect(fixture.nativeElement.textContent).toContain('Pontuação não disponível');
    expect(httpMock.match(URL_AVALIACOES).length).toBe(0);
  });
});

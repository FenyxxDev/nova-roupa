import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Proposta } from '../../models/proposta.model';
import { Propostas } from './propostas';

const URL_PROPOSTAS = `${environment.apiUrl}/propostas`;
const URL_LOTES = `${environment.apiUrl}/lotes`;

function proposta(parcial: Partial<Proposta> = {}): Proposta {
  return {
    id: 5,
    loteId: 9,
    comprador: 'loja-compras',
    vendedor: 'confecao-sul',
    mensagem: 'Tenho interesse em 10 kg.',
    telefoneContato: '11999999999',
    valorOfertado: 12,
    quantidadeKg: 10,
    status: 'PENDENTE',
    dataCriacao: '2026-11-18T09:00:00',
    dataAtualizacao: null,
    ...parcial,
  };
}

/** Prepara a sessão no `sessionStorage` antes de o serviço ser construído. */
function sessao(roles: string[]): void {
  sessionStorage.setItem('token', 'token-de-teste');
  sessionStorage.setItem('usuarioLogado', 'utilizador');
  sessionStorage.setItem('roles', JSON.stringify(roles));
}

describe('Propostas', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Propostas],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('carrega as propostas recebidas para um vendedor', () => {
    sessao(['ROLE_VENDEDOR']);
    const fixture = TestBed.createComponent(Propostas);
    fixture.detectChanges();

    httpMock.expectOne(`${URL_PROPOSTAS}/recebidas`).flush([proposta()]);
    expect(httpMock.match(`${URL_PROPOSTAS}/minhas`).length).toBe(0);

    expect(fixture.componentInstance.aba()).toBe('recebidas');
    expect(fixture.componentInstance.recebidas().length).toBe(1);
    expect(fixture.componentInstance.carregando()).toBe(false);
  });

  it('carrega apenas as propostas enviadas para um comprador', () => {
    sessao(['ROLE_COMPRADOR']);
    const fixture = TestBed.createComponent(Propostas);
    fixture.detectChanges();

    httpMock.expectOne(`${URL_PROPOSTAS}/minhas`).flush([proposta({ status: 'ACEITA' })]);
    expect(httpMock.match(`${URL_PROPOSTAS}/recebidas`).length).toBe(0);

    expect(fixture.componentInstance.aba()).toBe('minhas');
    expect(fixture.componentInstance.minhas()[0].status).toBe('ACEITA');
  });

  it('decide uma proposta recebida com PATCH e atualiza a lista', () => {
    sessao(['ROLE_VENDEDOR']);
    const fixture = TestBed.createComponent(Propostas);
    fixture.detectChanges();
    httpMock.expectOne(`${URL_PROPOSTAS}/recebidas`).flush([proposta()]);

    fixture.componentInstance.responder(proposta(), 'ACEITA');

    const pedido = httpMock.expectOne(`${URL_PROPOSTAS}/5/status`);
    expect(pedido.request.method).toBe('PATCH');
    expect(pedido.request.body).toEqual({ status: 'ACEITA' });
    pedido.flush(proposta({ status: 'ACEITA' }));

    expect(fixture.componentInstance.recebidas()[0].status).toBe('ACEITA');
  });

  it('abre o modal de contraproposta com o lote carregado', () => {
    sessao(['ROLE_VENDEDOR']);
    const fixture = TestBed.createComponent(Propostas);
    fixture.detectChanges();
    httpMock.expectOne(`${URL_PROPOSTAS}/recebidas`).flush([proposta()]);

    fixture.componentInstance.contrapor(proposta());

    httpMock.expectOne(`${URL_LOTES}/9`).flush({
      id: 9,
      vendedor: 'confecao-sul',
      tipoTecido: 'JEANS',
      pesoKg: 30,
      metragemAproximada: 12,
      corPredominante: 'azul',
      descricao: null,
      fotosUrls: null,
      localizacao: 'São Paulo',
      status: 'DISPONIVEL',
      dataPublicacao: '2026-11-01T10:00:00',
    });

    expect(fixture.componentInstance.loteDoModal()?.id).toBe(9);
    expect(fixture.componentInstance.propostaEmResposta()?.id).toBe(5);
  });

  it('mostra a mensagem de erro quando a API responde 403', () => {
    sessao(['ROLE_VENDEDOR']);
    const fixture = TestBed.createComponent(Propostas);
    fixture.detectChanges();

    httpMock
      .expectOne(`${URL_PROPOSTAS}/recebidas`)
      .flush({}, { status: 403, statusText: 'Forbidden' });

    expect(fixture.componentInstance.erro()).toContain('sessão');
    expect(fixture.componentInstance.carregando()).toBe(false);
  });

  it('fecha o modal limpando o lote e a proposta em resposta', () => {
    sessao(['ROLE_VENDEDOR']);
    const fixture = TestBed.createComponent(Propostas);
    fixture.detectChanges();
    httpMock.expectOne(`${URL_PROPOSTAS}/recebidas`).flush([]);

    fixture.componentInstance.loteDoModal.set({
      id: 9,
      tipoTecido: 'JEANS',
      pesoKg: 30,
      corPredominante: 'azul',
    });
    fixture.componentInstance.propostaEmResposta.set(proposta());

    fixture.componentInstance.fecharModal();

    expect(fixture.componentInstance.loteDoModal()).toBeNull();
    expect(fixture.componentInstance.propostaEmResposta()).toBeNull();
  });
});

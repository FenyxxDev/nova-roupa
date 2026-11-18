import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Login } from './login';
import { environment } from '../../../environments/environment';

const URL_LOGIN = `${environment.apiUrl}/auth/login`;

describe('Login', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([
          { path: 'catalogo', children: [] },
          { path: 'dashboard', children: [] },
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

  it('não envia pedido quando o formulário está vazio', () => {
    const fixture = TestBed.createComponent(Login);
    const componente = fixture.componentInstance;

    componente.submeter();

    httpMock.expectNone(URL_LOGIN);
    expect(componente.erro()).toBeNull();
    expect(componente.username.touched).toBe(true);
  });

  it('envia credenciais e guarda o token na sessão', () => {
    const fixture = TestBed.createComponent(Login);
    const componente = fixture.componentInstance;
    componente.formulario.setValue({ username: 'maria', password: 'segredo' });

    componente.submeter();

    const pedido = httpMock.expectOne(URL_LOGIN);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ username: 'maria', password: 'segredo' });

    pedido.flush({
      token: 'jwt-teste',
      type: 'Bearer',
      username: 'maria',
      roles: ['ROLE_VENDEDOR'],
      expiresIn: 3600000,
    });

    expect(sessionStorage.getItem('token')).toBe('jwt-teste');
    expect(componente.erro()).toBeNull();
    expect(componente.aEnviar()).toBe(false);
  });

  it('mostra mensagem amigável quando as credenciais são inválidas', () => {
    const fixture = TestBed.createComponent(Login);
    const componente = fixture.componentInstance;
    componente.formulario.setValue({ username: 'maria', password: 'errada' });

    componente.submeter();

    const pedido = httpMock.expectOne(URL_LOGIN);
    pedido.flush({ message: 'Credenciais inválidas' }, { status: 401, statusText: 'Unauthorized' });

    expect(componente.erro()).toContain('Credenciais inválidas');
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  it('respeita o parâmetro redirect ao escolher o destino', () => {
    const fixture = TestBed.createComponent(Login);
    const componente = fixture.componentInstance;
    expect(componente.destino()).toBe('/catalogo');
  });
});

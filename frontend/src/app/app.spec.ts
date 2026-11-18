import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App (shell)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('cria o shell da aplicação', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('oferece link de salto para o conteúdo principal', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.skip-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('#conteudo');
  });

  it('renderiza a marca e a navegação principal', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Nova Roupa');
    expect(fixture.nativeElement.querySelector('nav[aria-label="Navegação principal"]')).toBeTruthy();
  });

  it('mostra a ação de entrar quando não há sessão', () => {
    sessionStorage.clear();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Entrar');
  });
});

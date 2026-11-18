import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard, roleGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

const urlTree = { arvore: true } as unknown as UrlTree;

function configurar(autenticado: boolean, roles: string[]) {
  const router = {
    createUrlTree: vi.fn().mockReturnValue(urlTree),
  };
  const auth = {
    estaAutenticado: () => autenticado,
    temRole: (...papeis: string[]) => papeis.some((papel) => roles.includes(papel)),
  };
  const notificacoes = {
    aviso: vi.fn(),
    erro: vi.fn(),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: Router, useValue: router },
      { provide: AuthService, useValue: auth },
      { provide: NotificationService, useValue: notificacoes },
    ],
  });

  return { router, notificacoes };
}

function contexto(roles: string[] = []) {
  const rota = { data: { roles } } as unknown as ActivatedRouteSnapshot;
  const estado = { url: '/lotes/novo' } as RouterStateSnapshot;
  return { rota, estado };
}

describe('authGuard', () => {
  it('libera a navegação quando existe sessão válida', () => {
    configurar(true, []);
    const { rota, estado } = contexto();
    const resultado = TestBed.runInInjectionContext(() => authGuard(rota, estado));
    expect(resultado).toBe(true);
  });

  it('redireciona visitantes para o login guardando o destino', () => {
    const { router, notificacoes } = configurar(false, []);
    const { rota, estado } = contexto();

    const resultado = TestBed.runInInjectionContext(() => authGuard(rota, estado));

    expect(resultado).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/lotes/novo' },
    });
    expect(notificacoes.aviso).toHaveBeenCalled();
  });
});

describe('roleGuard', () => {
  it('permite quando o utilizador tem um dos papéis exigidos', () => {
    configurar(true, ['ROLE_VENDEDOR']);
    const { rota, estado } = contexto(['ROLE_VENDEDOR', 'ROLE_ADMIN']);
    const resultado = TestBed.runInInjectionContext(() => roleGuard(rota, estado));
    expect(resultado).toBe(true);
  });

  it('devolve à home quando falta o papel exigido', () => {
    const { router, notificacoes } = configurar(true, ['ROLE_COMPRADOR']);
    const { rota, estado } = contexto(['ROLE_VENDEDOR']);

    const resultado = TestBed.runInInjectionContext(() => roleGuard(rota, estado));

    expect(resultado).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(notificacoes.erro).toHaveBeenCalled();
  });

  it('exige sessão mesmo antes de avaliar papéis', () => {
    const { router } = configurar(false, []);
    const { rota, estado } = contexto(['ROLE_ADMIN']);

    const resultado = TestBed.runInInjectionContext(() => roleGuard(rota, estado));

    expect(resultado).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/lotes/novo' },
    });
  });
});

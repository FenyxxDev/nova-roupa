import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Bloqueia rotas privadas para visitantes.
 *
 * Sem sessão válida o utilizador é enviado para `/login`, guardando a rota
 * pretendida em `redirect` para voltar depois da autenticação.
 */
export const authGuard: CanActivateFn = (_rota, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notificacoes = inject(NotificationService);

  if (auth.estaAutenticado()) {
    return true;
  }

  notificacoes.aviso('É necessário entrar na conta para acessar esta página.');
  return router.createUrlTree(['/login'], {
    queryParams: { redirect: estado.url },
  });
};

/**
 * Exige que a sessão tenha um dos papéis declarados em `route.data.roles`.
 *
 * Sem sessão delega no comportamento do `authGuard`; com sessão mas sem o
 * papel exigido devolve o utilizador à home com um alerta explicativo.
 */
export const roleGuard: CanActivateFn = (rota, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notificacoes = inject(NotificationService);

  if (!auth.estaAutenticado()) {
    notificacoes.aviso('É necessário entrar na conta para acessar esta página.');
    return router.createUrlTree(['/login'], {
      queryParams: { redirect: estado.url },
    });
  }

  const papeis = (rota.data['roles'] as string[] | undefined) ?? [];
  if (papeis.length === 0 || auth.temRole(...papeis)) {
    return true;
  }

  notificacoes.erro('O seu perfil não tem permissão para esta área.');
  return router.createUrlTree(['/']);
};

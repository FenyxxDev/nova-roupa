import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth.guard';

/**
 * Rotas base do SPA (issue #14).
 *
 * Todas as páginas são carregadas de forma preguiçosa com `loadComponent`,
 * mantendo o bundle inicial pequeno. `/lotes/novo` exige VENDEDOR ou ADMIN;
 * `/perfil` exige sessão válida.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Nova Roupa — moda circular para retalhos têxteis',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    title: 'Entrar — Nova Roupa',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'catalogo',
    title: 'Catálogo de retalhos — Nova Roupa',
    loadComponent: () => import('./pages/catalogo/catalogo').then((m) => m.Catalogo),
  },
  {
    path: 'lotes/novo',
    title: 'Publicar lote — Nova Roupa',
    canActivate: [authGuard, roleGuard],
    loadComponent: () =>
      import('./pages/lote-cadastro/lote-cadastro').then((m) => m.LoteCadastro),
    data: { roles: ['ROLE_VENDEDOR', 'ROLE_ADMIN'] },
  },
  {
    path: 'dashboard',
    title: 'Painel de impacto — Nova Roupa',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'perfil',
    title: 'Meu perfil — Nova Roupa',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.Perfil),
  },
  {
    path: 'propostas',
    title: 'Propostas e contrapropostas — Nova Roupa',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/propostas/propostas').then((m) => m.Propostas),
  },
  {
    path: '**',
    title: 'Página não encontrada — Nova Roupa',
    loadComponent: () => import('./pages/em-breve/em-breve').then((m) => m.EmBreve),
    data: {
      titulo: 'Página não encontrada',
      descricao: 'O endereço acessado não existe. Use o menu para voltar ao início.',
    },
  },
];

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest } from '../models/login-request.model';
import { LoginResponse } from '../models/login-response.model';

/** Papéis suportados pelo backend (`roles` do token, com prefixo `ROLE_`). */
export type PapelUsuario = 'ROLE_COMPRADOR' | 'ROLE_VENDEDOR' | 'ROLE_ADMIN';

/** Sessão ativa reconstruída a partir do `sessionStorage`. */
export interface SessaoUsuario {
  readonly username: string;
  readonly roles: readonly string[];
  readonly expiraEm: number | null;
}

const CHAVE_TOKEN = 'token';
const CHAVE_USUARIO = 'usuarioLogado';
const CHAVE_ROLES = 'roles';
const CHAVE_EXPIRA = 'tokenExpiraEm';

/**
 * Autenticação do SPA: consome `POST /api/auth/login`, guarda o JWT e expõe a
 * sessão como signal para o shell e os guards reagirem sem polling.
 *
 * O token é mantido em `sessionStorage` (não em `localStorage`): fecha com a
 * aba, reduzindo a janela de exposição do JWT num computador partilhado.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly _sessao = signal<SessaoUsuario | null>(this.lerSessao());

  /** Sessão ativa (ou `null` quando anónimo). */
  readonly sessao = this._sessao.asReadonly();

  /** Indica se existe sessão válida; usado pelo shell para alternar a navbar. */
  readonly autenticado = computed(() => this._sessao() !== null);

  /** Nome do utilizador autenticado. */
  readonly username = computed(() => this._sessao()?.username ?? null);

  login(dados: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, dados).pipe(
      tap((resposta) => this.registarSessao(resposta)),
    );
  }

  logout(): void {
    sessionStorage.removeItem(CHAVE_TOKEN);
    sessionStorage.removeItem(CHAVE_USUARIO);
    sessionStorage.removeItem(CHAVE_ROLES);
    sessionStorage.removeItem(CHAVE_EXPIRA);
    this._sessao.set(null);
  }

  getToken(): string | null {
    return sessionStorage.getItem(CHAVE_TOKEN);
  }

  setUsuarioLogado(usuario: string): void {
    sessionStorage.setItem(CHAVE_USUARIO, usuario);
  }

  getUsuarioLogado(): string | null {
    return sessionStorage.getItem(CHAVE_USUARIO) ?? this.username();
  }

  removerUsuarioLogado(): void {
    sessionStorage.removeItem(CHAVE_USUARIO);
  }

  /** Papéis do utilizador autenticado (vazio quando anónimo). */
  getRoles(): string[] {
    const roles = this._sessao()?.roles;
    return roles ? [...roles] : [];
  }

  temRole(...papeis: string[]): boolean {
    const roles = this.getRoles();
    return papeis.some((papel) => roles.includes(papel));
  }

  isAdmin(): boolean {
    return this.temRole('ROLE_ADMIN');
  }

  isVendedor(): boolean {
    return this.temRole('ROLE_VENDEDOR') || this.isAdmin();
  }

  isComprador(): boolean {
    return this.temRole('ROLE_COMPRADOR') || this.isAdmin();
  }

  /** `true` apenas quando existe token e ele ainda não expirou. */
  estaAutenticado(): boolean {
    const sessao = this._sessao();
    if (!sessao) {
      return false;
    }
    if (sessao.expiraEm === null) {
      return true;
    }
    return sessao.expiraEm > Date.now();
  }

  /** Payload do JWT (claims), sem validar assinatura — uso apenas informativo. */
  decodificarToken(): Record<string, unknown> | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    const partes = token.split('.');
    if (partes.length !== 3) {
      return null;
    }
    try {
      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = decodeURIComponent(
        atob(preenchido)
          .split('')
          .map((caractere) => `%${`00${caractere.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(''),
      );
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private registarSessao(resposta: LoginResponse): void {
    const expiraEm = resposta.expiresIn > 0 ? Date.now() + resposta.expiresIn : null;
    const roles = resposta.roles ?? [];

    sessionStorage.setItem(CHAVE_TOKEN, resposta.token);
    sessionStorage.setItem(CHAVE_USUARIO, resposta.username);
    sessionStorage.setItem(CHAVE_ROLES, JSON.stringify(roles));
    if (expiraEm !== null) {
      sessionStorage.setItem(CHAVE_EXPIRA, String(expiraEm));
    }

    this._sessao.set({ username: resposta.username, roles, expiraEm });
  }

  private lerSessao(): SessaoUsuario | null {
    const token = sessionStorage.getItem(CHAVE_TOKEN);
    if (!token) {
      return null;
    }
    const username = sessionStorage.getItem(CHAVE_USUARIO) ?? '';
    const rolesBrutos = sessionStorage.getItem(CHAVE_ROLES);
    const expiraBruto = sessionStorage.getItem(CHAVE_EXPIRA);
    const expiraEm = expiraBruto ? Number(expiraBruto) : null;

    let roles: string[] = [];
    if (rolesBrutos) {
      try {
        const parseado: unknown = JSON.parse(rolesBrutos);
        if (Array.isArray(parseado)) {
          roles = parseado.filter((item): item is string => typeof item === 'string');
        }
      } catch {
        roles = [];
      }
    }

    if (expiraEm !== null && !Number.isNaN(expiraEm) && expiraEm <= Date.now()) {
      return null;
    }

    return { username, roles, expiraEm: Number.isNaN(expiraEm) ? null : expiraEm };
  }
}

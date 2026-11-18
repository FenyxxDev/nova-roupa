import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/** Endpoints em que o erro é tratado localmente pelo formulário (sem toast). */
const ENDPOINTS_COM_ERRO_LOCAL = ['/auth/login'];

function ehChamadaApi(url: string): boolean {
  return url.startsWith(`${environment.apiUrl}/`) || url.startsWith('/api/');
}

/** Mensagem amigável para cada família de erro HTTP (issue #69). */
export function mensagemDoErro(erro: HttpErrorResponse): string {
  if (erro.status === 0) {
    return 'Falha de rede: não foi possível contactar o servidor. Verifique a conexão.';
  }

  const corpo = erro.error as { message?: unknown } | null;
  const mensagemApi =
    corpo && typeof corpo === 'object' && typeof corpo.message === 'string' ? corpo.message : null;

  switch (erro.status) {
    case 400:
      return mensagemApi ?? 'Dados inválidos. Revise os campos e tente novamente.';
    case 401:
      return 'Sessão expirada ou credenciais inválidas. Entre novamente.';
    case 403:
      return 'O seu perfil não tem permissão para esta operação.';
    case 404:
      return 'Registro não encontrado.';
    case 409:
      return mensagemApi ?? 'A operação conflita com o estado atual do registro.';
    case 422:
      return mensagemApi ?? 'Não foi possível processar os dados enviados.';
    case 429:
      return 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.';
    default:
      if (erro.status >= 500) {
        return 'Erro interno no servidor. Tente novamente em instantes.';
      }
      return mensagemApi ?? 'Não foi possível concluir a operação.';
  }
}

/**
 * Injeta `Authorization: Bearer <token>` nas chamadas à API e traduz erros HTTP
 * em alertas globais, exceto nos endpoints que já mostram o erro no formulário.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notificacoes = inject(NotificationService);

  const token = auth.getToken();
  const deveAutenticar = token !== null && ehChamadaApi(req.url);

  const requisicao = deveAutenticar
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(requisicao).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse) {
        const erroLocal = ENDPOINTS_COM_ERRO_LOCAL.some((endpoint) => req.url.includes(endpoint));
        if (!erroLocal) {
          notificacoes.erro(mensagemDoErro(erro));
        }
      }
      return throwError(() => erro);
    }),
  );
};

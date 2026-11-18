import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

/**
 * Formulário de login (issues #30 e #14).
 *
 * Usa Reactive Forms com validação de preenchimento, consome
 * `POST /api/auth/login`, guarda o JWT em `sessionStorage` (via `AuthService`) e
 * redireciona conforme o papel devolvido pelo backend.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly notificacoes = inject(NotificationService);

  readonly formulario = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required]],
  });

  readonly aEnviar = signal(false);
  readonly erro = signal<string | null>(null);
  readonly senhaVisivel = signal(false);

  get username() {
    return this.formulario.controls.username;
  }

  get password() {
    return this.formulario.controls.password;
  }

  alternarSenha(): void {
    this.senhaVisivel.update((visivel) => !visivel);
  }

  submeter(): void {
    this.erro.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.aEnviar.set(true);
    this.auth.login(this.formulario.getRawValue()).subscribe({
      next: (resposta) => {
        this.aEnviar.set(false);
        this.notificacoes.sucesso(`Bem-vindo(a), ${resposta.username}.`);
        void this.router.navigateByUrl(this.destino());
      },
      error: (erro: unknown) => {
        this.aEnviar.set(false);
        this.erro.set(this.mensagemDeErro(erro));
      },
    });
  }

  /** Rota de destino: `?redirect=` tem prioridade; caso contrário decide o papel. */
  destino(): string {
    const redirect = this.rota.snapshot.queryParamMap.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('/login')) {
      return redirect;
    }
    if (this.auth.isAdmin()) {
      return '/dashboard';
    }
    if (this.auth.isVendedor()) {
      return '/catalogo';
    }
    return '/catalogo';
  }

  private mensagemDeErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      if (erro.status === 401) {
        return 'Credenciais inválidas. Verifique o usuário e a senha.';
      }
      if (erro.status === 429) {
        return 'Muitas tentativas de login. Aguarde alguns instantes e tente novamente.';
      }
      if (erro.status === 0) {
        return 'Não foi possível contactar o servidor. Verifique a conexão e tente novamente.';
      }
      const corpo = erro.error as { message?: unknown } | null;
      if (corpo && typeof corpo.message === 'string') {
        return corpo.message;
      }
    }
    return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }
}

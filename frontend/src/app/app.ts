import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Toast } from './components/toast/toast';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';

/**
 * Shell da SPA: cabeçalho com navegação responsiva, conteúdo roteado,
 * rodapé institucional e a região global de toasts.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacoes = inject(NotificationService);

  readonly autenticado = this.auth.autenticado;
  readonly username = this.auth.username;
  readonly podePublicar = computed(() => this.auth.isVendedor());
  readonly menuAberto = signal(false);
  readonly anoAtual = new Date().getFullYear();

  alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  fecharMenu(): void {
    this.menuAberto.set(false);
  }

  sair(): void {
    this.auth.logout();
    this.fecharMenu();
    this.notificacoes.info('Sessão encerrada com segurança.');
    void this.router.navigateByUrl('/');
  }
}

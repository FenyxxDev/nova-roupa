import { Component, inject } from '@angular/core';
import { NotificationService, TipoNotificacao } from '../../services/notification.service';

/**
 * Região fixa de alertas do shell (issue #54 e #69).
 *
 * Cada toast usa `role="status"`/`role="alert"` com `aria-live`, garante
 * contraste AA (texto escuro sobre fundo claro) e pode ser dispensado pelo
 * utilizador; o fecho automático acontece em 4 segundos.
 */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  private readonly notificationService = inject(NotificationService);

  readonly notificacoes = this.notificationService.notificacoes;

  dispensar(id: number): void {
    this.notificationService.dispensar(id);
  }

  rotulo(tipo: TipoNotificacao): string {
    switch (tipo) {
      case 'sucesso':
        return 'Sucesso';
      case 'aviso':
        return 'Atenção';
      case 'erro':
        return 'Erro';
      default:
        return 'Informação';
    }
  }

  icone(tipo: TipoNotificacao): string {
    switch (tipo) {
      case 'sucesso':
        return '✓';
      case 'aviso':
        return '!';
      case 'erro':
        return '×';
      default:
        return 'i';
    }
  }
}

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/** Página inicial pública: apresenta a proposta da plataforma e os caminhos de entrada. */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly auth = inject(AuthService);

  readonly autenticado = this.auth.autenticado;
  readonly username = this.auth.username;
}

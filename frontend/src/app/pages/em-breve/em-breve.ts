import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * Página de transição usada pelas rotas base já registadas no roteador
 * enquanto a feature correspondente não é entregue.
 *
 * O título e a descrição vêm de `route.data`, portanto a mesma página serve
 * para o catálogo, o painel de impacto, o perfil e o 404.
 */
@Component({
  selector: 'app-em-breve',
  imports: [RouterLink],
  templateUrl: './em-breve.html',
  styleUrl: './em-breve.css',
})
export class EmBreve {
  private readonly rota = inject(ActivatedRoute);

  readonly titulo = (this.rota.snapshot.data['titulo'] as string | undefined) ?? 'Em breve';
  readonly descricao =
    (this.rota.snapshot.data['descricao'] as string | undefined) ??
    'Esta área está em construção.';
}

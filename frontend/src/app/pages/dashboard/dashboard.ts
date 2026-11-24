import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardImpacto } from '../../models/dashboard-impacto.model';
import { DashboardImpactoService } from '../../services/dashboard-impacto.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly service = inject(DashboardImpactoService);
  private readonly destroyRef = inject(DestroyRef);
  readonly dados = signal<DashboardImpacto | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  constructor() { this.carregar(); }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.service.consultar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (dados) => { this.dados.set(dados); this.carregando.set(false); },
      error: (falha: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(falha.status === 0
          ? 'Não foi possível contactar o servidor. Verifique a ligação.'
          : 'As métricas ainda não estão disponíveis. Tente novamente em instantes.');
      },
    });
  }

  formatar(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(valor);
  }
}

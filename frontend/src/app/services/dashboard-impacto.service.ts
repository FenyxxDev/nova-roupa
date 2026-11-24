import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardImpacto } from '../models/dashboard-impacto.model';

@Injectable({ providedIn: 'root' })
export class DashboardImpactoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard/impacto`;

  consultar(): Observable<DashboardImpacto> {
    return this.http.get<DashboardImpacto>(this.apiUrl);
  }
}

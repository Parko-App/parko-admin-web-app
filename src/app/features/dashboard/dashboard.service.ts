import { Injectable, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { Observable, of } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { DashboardSummary, RecentAccess } from '../../core/models/dashboard.model';
import { ApiClient } from '../../core/services/api-client.service';
import { ARGENTINA_UTC_OFFSET } from '../../shared/utils/argentina-time';

export abstract class DashboardService {
  abstract getSummary(): Observable<DashboardSummary>;
  abstract getRecentAccess(limit: number): Observable<RecentAccess[]>;
}

@Injectable()
export class HttpDashboardService extends DashboardService {
  private readonly api = inject(ApiClient);

  getSummary(): Observable<DashboardSummary> {
    return this.api.get<DashboardSummary>('admin/dashboard/summary');
  }

  getRecentAccess(limit: number): Observable<RecentAccess[]> {
    return this.api.get<RecentAccess[]>('admin/dashboard/recent-access', { limit });
  }
}

const HOURLY_VEHICLES = [
  10, 6, 4, 3, 8, 25, 70, 130, 180, 215, 228, 238, 225, 200, 205, 212, 208, 190, 150, 95, 55, 30, 20, 14,
];

/** Datos de demostración (solo con useMocks: true). */
@Injectable()
export class MockDashboardService extends DashboardService {
  getSummary(): Observable<DashboardSummary> {
    return of({
      occupancy: { current: 221, capacity: 247 },
      revenueToday: { amount: 18340, changePercent: 12 },
      activeSessions: { total: 221, visitors: 8, registered: 213 },
      visitorsToday: { count: 34, collected: 9120, pendingPayments: 12 },
      dayStats: {
        entries: 335,
        exits: 114,
        uniqueVisitors: 34,
        paymentsProcessed: 28,
        paymentsPending: 6,
        openIncidents: 3,
      },
      occupancyByHour: HOURLY_VEHICLES.map((vehicles, hour) => ({ hour, vehicles })),
    });
  }

  getRecentAccess(limit: number): Observable<RecentAccess[]> {
    const day = formatDate(new Date(), 'yyyy-MM-dd', 'en', ARGENTINA_UTC_OFFSET);
    const at = (time: string) => `${day}T${time}:00-03:00`;
    const rows: RecentAccess[] = [
      { id: 'A-8821', plate: 'AB 123 CD', userName: 'Lucas Fernández', userType: 'REGISTERED', timestamp: at('10:47'), movement: 'ENTRY' },
      { id: 'V-0043', plate: null, userName: 'Visitante', userType: 'VISITOR', timestamp: at('10:39'), movement: 'ENTRY' },
      { id: 'A-8820', plate: 'GH 789 IJ', userName: 'Valentina Romero', userType: 'REGISTERED', timestamp: at('10:31'), movement: 'EXIT' },
      { id: 'A-8819', plate: 'CD 456 EF', userName: 'Martín Gutiérrez', userType: 'REGISTERED', timestamp: at('10:22'), movement: 'ENTRY' },
      { id: 'V-0042', plate: null, userName: 'Visitante', userType: 'VISITOR', timestamp: at('10:14'), movement: 'EXIT' },
      { id: 'A-8818', plate: 'KL 321 MN', userName: 'Sofía Herrera', userType: 'TEACHER', timestamp: at('10:08'), movement: 'ENTRY' },
      { id: 'A-8817', plate: 'OP 654 QR', userName: 'Diego Morales', userType: 'REGISTERED', timestamp: at('09:55'), movement: 'ENTRY' },
      { id: 'A-8816', plate: 'ST 987 UV', userName: 'Ana López', userType: 'STAFF', timestamp: at('09:41'), movement: 'EXIT' },
    ];
    return of(rows.slice(0, limit));
  }
}

/** Proveedor del servicio del dashboard según USE_MOCKS. */
export const DASHBOARD_SERVICE_PROVIDER = {
  provide: DashboardService,
  useFactory: () => (inject(USE_MOCKS) ? new MockDashboardService() : new HttpDashboardService()),
};

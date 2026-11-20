import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import {
  AccessDay,
  AccessReport,
  DateRange,
  OccupancyDay,
  OccupancyReport,
  RevenueDay,
  RevenueReport,
} from '../../core/models/report.model';
import { ApiClient } from '../../core/services/api-client.service';
import { eachDay } from '../../shared/utils/dates';

export abstract class ReportsService {
  abstract occupancy(range: DateRange): Observable<OccupancyReport>;
  abstract revenue(range: DateRange): Observable<RevenueReport>;
  abstract access(range: DateRange): Observable<AccessReport>;
}

@Injectable()
export class HttpReportsService extends ReportsService {
  private readonly api = inject(ApiClient);

  occupancy(range: DateRange): Observable<OccupancyReport> {
    return this.api.get<OccupancyReport>('admin/reports/occupancy', { ...range });
  }

  revenue(range: DateRange): Observable<RevenueReport> {
    return this.api.get<RevenueReport>('admin/reports/revenue', { ...range });
  }

  access(range: DateRange): Observable<AccessReport> {
    return this.api.get<AccessReport>('admin/reports/access', { ...range });
  }
}

export const MOCK_CAPACITY = 247;

/** Número estable (0..1) a partir de una fecha y una "sal": los mocks no cambian entre consultas. */
function noise(date: string, salt: number): number {
  let hash = salt * 2654435761;
  for (const char of date) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0;
  return (hash % 1000) / 1000;
}

const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Datos de demostración generados a partir de las fechas (solo con useMocks: true). */
@Injectable()
export class MockReportsService extends ReportsService {
  occupancy(range: DateRange): Observable<OccupancyReport> {
    const days: OccupancyDay[] = eachDay(range.from, range.to).map((date) => {
      const weekday = weekdayOf(date);
      const peak =
        weekday === 6 ? 80 + Math.round(noise(date, 1) * 20) : weekday === 0 ? 215 + Math.round(noise(date, 1) * 15) : 225 + Math.round(noise(date, 1) * 20);
      const average = Math.round(peak * (weekday === 6 ? 0.62 : 0.8 + noise(date, 2) * 0.05));
      return { date, peak, average };
    });
    return of({ capacity: MOCK_CAPACITY, days });
  }

  revenue(range: DateRange): Observable<RevenueReport> {
    const days: RevenueDay[] = eachDay(range.from, range.to).map((date) => {
      const weekend = weekdayOf(date) === 6;
      const registered = Math.round((weekend ? 2000 : 8000 + noise(date, 3) * 1600) / 50) * 50;
      const visitors = Math.round((weekend ? 4000 : 10500 + noise(date, 4) * 2800) / 50) * 50;
      return { date, registered, visitors };
    });
    return of({ days });
  }

  access(range: DateRange): Observable<AccessReport> {
    const days: AccessDay[] = eachDay(range.from, range.to).map((date) => {
      const weekend = weekdayOf(date) === 6;
      const entries = weekend ? 100 + Math.round(noise(date, 5) * 20) : 318 + Math.round(noise(date, 5) * 35);
      const exits = entries - 2 - Math.round(noise(date, 6) * (weekend ? 6 : 28));
      const visitors = Math.round(entries * (0.08 + noise(date, 7) * 0.05));
      return { date, entries, exits, visitors, registered: entries - visitors };
    });
    return of({ days });
  }
}

export const REPORTS_SERVICE_PROVIDER = {
  provide: ReportsService,
  useFactory: () => (inject(USE_MOCKS) ? new MockReportsService() : new HttpReportsService()),
};

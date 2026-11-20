import { DecimalPipe, formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, forkJoin, map, merge, of, switchMap, tap, timer } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import { SortState } from '../../core/models/sort.model';
import { AccessMovement, AccessUserType, RecentAccess } from '../../core/models/dashboard.model';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { NavBadgesService } from '../../layout/nav-badges.service';
import { AsyncStateComponent } from '../../shared/components/async-state/async-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { ChartPoint, LineChartComponent } from '../../shared/components/line-chart/line-chart.component';
import { BadgeVariant, StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { sortRows } from '../../shared/utils/sort';
import { CurrencyArPipe } from '../../shared/pipes/currency-ar.pipe';
import { DateTimeArPipe } from '../../shared/pipes/date-time-ar.pipe';
import { AsyncStatus } from '../../shared/utils/async-state';
import { ARGENTINA_UTC_OFFSET } from '../../shared/utils/argentina-time';
import { DashboardService } from './dashboard.service';

const REFRESH_MS = 30_000;
const RECENT_LIMIT = 8;

const USER_TYPES: Record<AccessUserType, { label: string; variant: BadgeVariant }> = {
  REGISTERED: { label: 'Registrado', variant: 'neutral' },
  VISITOR: { label: 'Visitante', variant: 'orange' },
  TEACHER: { label: 'Docente', variant: 'info' },
  STAFF: { label: 'Personal', variant: 'success' },
};

const MOVEMENTS: Record<AccessMovement, { label: string; arrow: string; css: string }> = {
  ENTRY: { label: 'Ingreso', arrow: '↓', css: 'movement--entry' },
  EXIT: { label: 'Egreso', arrow: '↑', css: 'movement--exit' },
};

const ACCESS_SORT: Record<string, (row: RecentAccess) => unknown> = {
  id: (row) => row.id,
  plate: (row) => row.plate,
  userName: (row) => row.userName,
  userType: (row) => USER_TYPES[row.userType].label,
  timestamp: (row) => Date.parse(row.timestamp),
  movement: (row) => MOVEMENTS[row.movement].label,
};

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    AsyncStateComponent,
    EmptyStateComponent,
    IconComponent,
    KpiCardComponent,
    LineChartComponent,
    SortHeaderComponent,
    StatusBadgeComponent,
    CurrencyArPipe,
    DateTimeArPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly service = inject(DashboardService);
  private readonly badges = inject(NavBadgesService);
  private readonly reload$ = new Subject<void>();

  protected readonly status = signal<AsyncStatus>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly recent = signal<RecentAccess[]>([]);
  protected readonly sort = signal<SortState | null>(null);
  /** Son pocos registros y sin paginación: se ordenan en el navegador. */
  protected readonly sortedRecent = computed(() => sortRows(this.recent(), this.sort(), ACCESS_SORT));
  /** La actualización automática falló pero se siguen mostrando los últimos datos. */
  protected readonly refreshFailed = signal(false);

  protected readonly today = formatDate(new Date(), 'dd/MM/yyyy', 'es-AR', ARGENTINA_UTC_OFFSET);

  protected readonly occupancyPercent = computed(() => {
    const occupancy = this.summary()?.occupancy;
    return occupancy && occupancy.capacity > 0 ? (occupancy.current / occupancy.capacity) * 100 : 0;
  });

  protected readonly occupancyBadge = computed<{ label: string; variant: BadgeVariant }>(() => {
    const percent = this.occupancyPercent();
    if (percent >= 98) return { label: 'Completa', variant: 'danger' };
    if (percent >= 80) return { label: 'Alta', variant: 'info' };
    if (percent >= 50) return { label: 'Media', variant: 'neutral' };
    return { label: 'Baja', variant: 'success' };
  });

  protected readonly chartPoints = computed<ChartPoint[]>(() =>
    (this.summary()?.occupancyByHour ?? []).map((item) => ({
      label: `${String(item.hour).padStart(2, '0')}:00`,
      value: item.vehicles,
    })),
  );

  protected readonly chartLabel = computed(() => {
    const points = this.chartPoints();
    if (points.length === 0) {
      return 'Ocupación por hora de hoy: sin datos.';
    }
    const peak = points.reduce((best, point) => (point.value > best.value ? point : best));
    return `Vehículos estacionados por hora. Pico de ${peak.value} vehículos a las ${peak.label}.`;
  });

  protected readonly revenueChange = computed(() => {
    const change = this.summary()?.revenueToday.changePercent ?? 0;
    return {
      badge: `${change >= 0 ? '+' : '−'}${Math.abs(change)}%`,
      variant: (change >= 0 ? 'success' : 'danger') as BadgeVariant,
      hint: `${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}% vs. ayer`,
    };
  });

  protected readonly pendingBadge = computed(() => {
    const pending = this.summary()?.visitorsToday.pendingPayments ?? 0;
    return pending > 0 ? `${pending} pendientes` : '';
  });

  constructor() {
    merge(timer(0, REFRESH_MS), this.reload$)
      .pipe(
        switchMap(() => this.load()),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected retry(): void {
    this.status.set('loading');
    this.reload$.next();
  }

  protected userType(type: AccessUserType) {
    return USER_TYPES[type];
  }

  protected movement(movement: AccessMovement) {
    return MOVEMENTS[movement];
  }

  private load(): Observable<void> {
    return forkJoin({
      summary: this.service.getSummary(),
      recent: this.service.getRecentAccess(RECENT_LIMIT),
    }).pipe(
      tap(({ summary, recent }) => {
        this.summary.set(summary);
        this.recent.set(recent);
        this.error.set(null);
        this.refreshFailed.set(false);
        this.status.set('success');
        this.badges.openIncidents.set(summary.dayStats.openIncidents);
      }),
      map(() => undefined),
      catchError((error: unknown) => {
        if (this.summary()) {
          this.refreshFailed.set(true);
        } else {
          this.error.set(toErrorMessage(error));
          this.status.set('error');
        }
        return of(undefined);
      }),
    );
  }
}

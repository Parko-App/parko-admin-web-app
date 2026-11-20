import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DateRange, RevenueReport } from '../../../core/models/report.model';
import { SortState } from '../../../core/models/sort.model';
import { BarChartComponent } from '../../../shared/components/bar-chart/bar-chart.component';
import { ChartSeries } from '../../../shared/components/chart-types';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { SortHeaderComponent } from '../../../shared/components/sort-header/sort-header.component';
import { CurrencyArPipe } from '../../../shared/pipes/currency-ar.pipe';
import { formatMoneyAxis } from '../../../shared/utils/chart';
import { formatDayFull, formatDayLong, formatDayShort } from '../../../shared/utils/dates';
import { sortRows } from '../../../shared/utils/sort';

interface RevenueRow {
  date: string;
  registered: number;
  visitors: number;
  total: number;
}

const ACCESSORS: Record<string, (row: RevenueRow) => unknown> = {
  date: (r) => r.date,
  registered: (r) => r.registered,
  visitors: (r) => r.visitors,
  total: (r) => r.total,
};

@Component({
  selector: 'app-revenue-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BarChartComponent, KpiCardComponent, SortHeaderComponent, CurrencyArPipe],
  templateUrl: './revenue-view.component.html',
  styleUrl: './revenue-view.component.scss',
})
export class RevenueViewComponent {
  readonly report = input.required<RevenueReport>();
  readonly range = input.required<DateRange>();

  protected readonly sort = signal<SortState | null>(null);
  protected readonly formatAxis = formatMoneyAxis;

  private readonly allRows = computed(() =>
    this.report().days.map<RevenueRow>((day) => ({ ...day, total: day.registered + day.visitors })),
  );
  protected readonly rows = computed(() => sortRows(this.allRows(), this.sort(), ACCESSORS));

  /** Indicadores calculados con los datos del reporte (no vienen del backend). */
  protected readonly summary = computed(() => {
    const rows = this.allRows();
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const best = rows.reduce<RevenueRow | null>((top, row) => (top === null || row.total > top.total ? row : top), null);
    return {
      total,
      dailyAverage: rows.length ? total / rows.length : 0,
      best,
    };
  });

  protected readonly labels = computed(() => this.report().days.map((day) => formatDayShort(day.date)));
  protected readonly series = computed<ChartSeries[]>(() => [
    { name: 'Registrados', values: this.report().days.map((d) => d.registered), color: 'var(--color-primary)' },
    { name: 'Visitantes', values: this.report().days.map((d) => d.visitors), color: '#7ba7d4' },
  ]);

  protected readonly rangeText = computed(() => `${formatDayFull(this.range().from)} — ${formatDayFull(this.range().to)}`);
  protected readonly ariaLabel = computed(() => `Recaudación por día, registrados y visitantes, ${this.rangeText()}`);

  protected day(date: string): string { return formatDayShort(date); }
  protected longDay(date: string): string { return formatDayLong(date); }
}

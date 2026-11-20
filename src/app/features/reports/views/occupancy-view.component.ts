import { formatNumber } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DateRange, OccupancyReport } from '../../../core/models/report.model';
import { SortState } from '../../../core/models/sort.model';
import { BarChartComponent } from '../../../shared/components/bar-chart/bar-chart.component';
import { ChartSeries } from '../../../shared/components/chart-types';
import { SortHeaderComponent } from '../../../shared/components/sort-header/sort-header.component';
import { formatDayFull, formatDayShort } from '../../../shared/utils/dates';
import { sortRows } from '../../../shared/utils/sort';

/** A partir de este porcentaje de la capacidad, el día se marca en rojo. */
export const HIGH_OCCUPANCY_PERCENT = 90;

interface OccupancyRow {
  date: string;
  peak: number;
  average: number;
  peakPercent: number;
  averagePercent: number;
}

const ACCESSORS: Record<string, (row: OccupancyRow) => unknown> = {
  date: (r) => r.date,
  peak: (r) => r.peak,
  average: (r) => r.average,
  peakPercent: (r) => r.peakPercent,
  averagePercent: (r) => r.averagePercent,
};

@Component({
  selector: 'app-occupancy-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BarChartComponent, SortHeaderComponent],
  templateUrl: './occupancy-view.component.html',
  styleUrl: './occupancy-view.component.scss',
})
export class OccupancyViewComponent {
  readonly report = input.required<OccupancyReport>();
  readonly range = input.required<DateRange>();

  protected readonly sort = signal<SortState | null>(null);
  protected readonly highThreshold = HIGH_OCCUPANCY_PERCENT;

  private readonly percentOf = (value: number) => (this.report().capacity > 0 ? (value / this.report().capacity) * 100 : 0);

  protected readonly rows = computed(() => {
    const data = this.report().days.map<OccupancyRow>((day) => ({
      ...day,
      peakPercent: this.percentOf(day.peak),
      averagePercent: this.percentOf(day.average),
    }));
    return sortRows(data, this.sort(), ACCESSORS);
  });

  protected readonly labels = computed(() => this.report().days.map((day) => formatDayShort(day.date)));
  protected readonly series = computed<ChartSeries[]>(() => [
    { name: 'Pico', values: this.report().days.map((d) => d.peak), color: 'var(--color-primary)' },
    { name: 'Promedio', values: this.report().days.map((d) => d.average), color: 'var(--color-subtle)' },
  ]);

  protected readonly rangeText = computed(() => `${formatDayFull(this.range().from)} — ${formatDayFull(this.range().to)}`);
  protected readonly ariaLabel = computed(() => `Ocupación histórica, pico y promedio por día, ${this.rangeText()}`);

  protected day(date: string): string { return formatDayShort(date); }
  protected percent(value: number): string { return `${formatNumber(value, 'es-AR', '1.1-1')}%`; }
}

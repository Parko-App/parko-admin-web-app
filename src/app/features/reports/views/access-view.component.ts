import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { AccessReport, DateRange } from '../../../core/models/report.model';
import { SortState } from '../../../core/models/sort.model';
import { ChartSeries } from '../../../shared/components/chart-types';
import { MultiLineChartComponent } from '../../../shared/components/multi-line-chart/multi-line-chart.component';
import { SortHeaderComponent } from '../../../shared/components/sort-header/sort-header.component';
import { formatDayFull, formatDayShort } from '../../../shared/utils/dates';
import { sortRows } from '../../../shared/utils/sort';

type AccessRow = AccessReport['days'][number];

const ACCESSORS: Record<string, (row: AccessRow) => unknown> = {
  date: (r) => r.date,
  entries: (r) => r.entries,
  exits: (r) => r.exits,
  visitors: (r) => r.visitors,
  registered: (r) => r.registered,
};

@Component({
  selector: 'app-access-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MultiLineChartComponent, SortHeaderComponent],
  templateUrl: './access-view.component.html',
  styleUrl: './access-view.component.scss',
})
export class AccessViewComponent {
  readonly report = input.required<AccessReport>();
  readonly range = input.required<DateRange>();

  protected readonly sort = signal<SortState | null>(null);
  protected readonly rows = computed(() => sortRows(this.report().days, this.sort(), ACCESSORS));

  protected readonly labels = computed(() => this.report().days.map((day) => formatDayShort(day.date)));
  protected readonly series = computed<ChartSeries[]>(() => [
    { name: 'Ingresos', values: this.report().days.map((d) => d.entries), color: 'var(--color-primary)' },
    { name: 'Egresos', values: this.report().days.map((d) => d.exits), color: 'var(--color-orange)' },
    { name: 'Visitantes', values: this.report().days.map((d) => d.visitors), color: 'var(--color-purple)' },
  ]);

  protected readonly rangeText = computed(() => `${formatDayFull(this.range().from)} — ${formatDayFull(this.range().to)}`);
  protected readonly ariaLabel = computed(() => `Accesos por día: ingresos, egresos y visitantes, ${this.rangeText()}`);

  protected day(date: string): string { return formatDayFull(date); }
}

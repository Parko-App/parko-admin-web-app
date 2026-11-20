import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { labelStep, niceMax } from '../../utils/chart';
import { ChartSeries } from '../chart-types';

const WIDTH = 1000;
const HEIGHT = 280;
const PAD = { left: 44, right: 24, top: 12, bottom: 28 };
const Y_TICKS = 4;

/**
 * Barras sin dependencias: agrupadas (una al lado de la otra) o apiladas.
 * `max` fija el tope del eje Y (por ejemplo, la capacidad); si no, se calcula "lindo" desde los datos.
 */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.scss',
})
export class BarChartComponent {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly mode = input<'grouped' | 'stacked'>('grouped');
  readonly ariaLabel = input.required<string>();
  readonly max = input<number | null>(null);
  readonly formatValue = input<(value: number) => string>((value) => String(value));

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly plotLeft = PAD.left;
  protected readonly plotRight = WIDTH - PAD.right;
  protected readonly plotBottom = HEIGHT - PAD.bottom;
  protected readonly labelY = HEIGHT - 8;

  private readonly plotWidth = WIDTH - PAD.left - PAD.right;
  private readonly plotHeight = HEIGHT - PAD.top - PAD.bottom;

  protected readonly yMax = computed(() => {
    const fixed = this.max();
    if (fixed !== null && fixed > 0) {
      return fixed;
    }
    const series = this.series();
    const count = this.labels().length;
    const totals = Array.from({ length: count }, (_, i) =>
      this.mode() === 'stacked'
        ? series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0)
        : Math.max(0, ...series.map((s) => s.values[i] ?? 0)),
    );
    return niceMax(Math.max(0, ...totals), Y_TICKS);
  });

  protected readonly yTicks = computed(() =>
    Array.from({ length: Y_TICKS + 1 }, (_, i) => {
      const value = Math.round((this.yMax() / Y_TICKS) * i);
      return { value, y: this.yFor(value) };
    }),
  );

  protected readonly groups = computed(() => {
    const labels = this.labels();
    const series = this.series();
    const grouped = this.mode() === 'grouped';
    const slot = this.plotWidth / Math.max(1, labels.length);
    const inner = slot * 0.8;
    const barWidth = grouped ? inner / Math.max(1, series.length) : inner;
    const step = labelStep(labels.length);

    return labels.map((label, i) => {
      const start = PAD.left + slot * i + (slot - inner) / 2;
      let stackTop = 0;
      const bars = series.map((s, k) => {
        const value = s.values[i] ?? 0;
        const base = grouped ? 0 : stackTop;
        stackTop += value;
        const top = this.yFor(Math.min(base + value, this.yMax()));
        const bottom = this.yFor(base);
        return {
          name: s.name,
          color: s.color,
          value,
          x: grouped ? start + k * barWidth : start,
          y: top,
          width: Math.max(1, barWidth - (grouped && series.length > 1 ? 0.5 : 0)),
          height: Math.max(0, bottom - top),
        };
      });
      return { label, bars, labelX: start + inner / 2, showLabel: i % step === 0 };
    });
  });

  private yFor(value: number): number {
    return PAD.top + this.plotHeight - (value / this.yMax()) * this.plotHeight;
  }
}

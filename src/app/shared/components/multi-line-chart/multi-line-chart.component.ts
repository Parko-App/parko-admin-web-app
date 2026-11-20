import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { labelStep, niceMax, smoothPath } from '../../utils/chart';
import { ChartSeries } from '../chart-types';

const WIDTH = 1000;
const HEIGHT = 280;
const PAD = { left: 44, right: 28, top: 12, bottom: 28 };
const Y_TICKS = 4;

/** Varias curvas suaves con puntos, leyenda y detalle al pasar el mouse. Sin dependencias. */
@Component({
  selector: 'app-multi-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './multi-line-chart.component.html',
  styleUrl: './multi-line-chart.component.scss',
})
export class MultiLineChartComponent {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly ariaLabel = input.required<string>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly plotLeft = PAD.left;
  protected readonly plotRight = WIDTH - PAD.right;
  protected readonly plotBottom = HEIGHT - PAD.bottom;
  protected readonly labelY = HEIGHT - 8;
  protected readonly hovered = signal<number | null>(null);

  private readonly plotWidth = WIDTH - PAD.left - PAD.right;
  private readonly plotHeight = HEIGHT - PAD.top - PAD.bottom;

  protected readonly yMax = computed(() =>
    niceMax(Math.max(0, ...this.series().flatMap((s) => s.values)), Y_TICKS),
  );

  protected readonly yTicks = computed(() =>
    Array.from({ length: Y_TICKS + 1 }, (_, i) => {
      const value = Math.round((this.yMax() / Y_TICKS) * i);
      return { value, y: this.yFor(value) };
    }),
  );

  private readonly xs = computed(() => {
    const last = Math.max(1, this.labels().length - 1);
    return this.labels().map((_, i) => PAD.left + (i / last) * this.plotWidth);
  });

  protected readonly lines = computed(() =>
    this.series().map((s) => {
      const points = this.xs().map((x, i) => ({ x, y: this.yFor(s.values[i] ?? 0) }));
      return { name: s.name, color: s.color, points, path: smoothPath(points) };
    }),
  );

  protected readonly xLabels = computed(() => {
    const step = labelStep(this.labels().length);
    return this.labels()
      .map((label, i) => ({ label, x: this.xs()[i] }))
      .filter((_, i) => i % step === 0);
  });

  protected readonly tooltip = computed(() => {
    const index = this.hovered();
    if (index === null || index >= this.labels().length) {
      return null;
    }
    const lines = [this.labels()[index], ...this.series().map((s) => `${s.name}: ${s.values[index] ?? 0}`)];
    const boxWidth = Math.max(...lines.map((line) => line.length)) * 6.4 + 20;
    const boxHeight = lines.length * 15 + 10;
    const x = Math.min(Math.max(this.xs()[index] - boxWidth / 2, PAD.left), WIDTH - PAD.right - boxWidth);
    return { index, cursorX: this.xs()[index], x, y: PAD.top + 4, width: boxWidth, height: boxHeight, lines };
  });

  protected onMove(event: PointerEvent): void {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const count = this.labels().length;
    if (rect.width === 0 || count === 0) {
      return;
    }
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (x - PAD.left) / this.plotWidth;
    this.hovered.set(Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))));
  }

  private yFor(value: number): number {
    return PAD.top + this.plotHeight - (value / this.yMax()) * this.plotHeight;
  }
}

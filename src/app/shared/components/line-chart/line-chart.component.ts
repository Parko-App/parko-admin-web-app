import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface ChartPoint {
  label: string;
  value: number;
}

const WIDTH = 800;
const HEIGHT = 240;
const PAD = { left: 40, right: 12, top: 12, bottom: 28 };
const Y_TICKS = 4;
let nextId = 0;

/** Curva suave que pasa por todos los puntos (Catmull-Rom convertida a Bézier). */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) {
    return '';
  }
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return path;
}

/** Gráfico de área sin dependencias. Muestra el valor de cada punto al pasar el mouse. */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.scss',
})
export class LineChartComponent {
  readonly points = input.required<ChartPoint[]>();
  readonly ariaLabel = input.required<string>();
  /** Unidad para el tooltip y la tabla accesible. */
  readonly unit = input('');
  /** Se muestra una etiqueta del eje X cada N puntos. */
  readonly labelEvery = input(4);

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly gradientId = `chart-fill-${nextId++}`;
  protected readonly hovered = signal<number | null>(null);

  private readonly plotWidth = WIDTH - PAD.left - PAD.right;
  private readonly plotHeight = HEIGHT - PAD.top - PAD.bottom;

  protected readonly yMax = computed(() => {
    const max = Math.max(0, ...this.points().map((p) => p.value));
    const unit = max >= 40 ? 10 : 1;
    return Math.max(1, Math.ceil(max / Y_TICKS / unit) * unit * Y_TICKS);
  });

  protected readonly yTicks = computed(() =>
    Array.from({ length: Y_TICKS + 1 }, (_, i) => {
      const value = (this.yMax() / Y_TICKS) * i;
      return { value, y: this.yFor(value) };
    }),
  );

  protected readonly coords = computed(() => {
    const data = this.points();
    const last = Math.max(1, data.length - 1);
    return data.map((point, i) => ({
      x: PAD.left + (i / last) * this.plotWidth,
      y: this.yFor(point.value),
      ...point,
    }));
  });

  protected readonly xLabels = computed(() =>
    this.coords().filter((_, i) => i % Math.max(1, this.labelEvery()) === 0),
  );

  protected readonly linePath = computed(() => smoothPath(this.coords()));

  protected readonly areaPath = computed(() => {
    const c = this.coords();
    if (c.length === 0) {
      return '';
    }
    const bottom = PAD.top + this.plotHeight;
    return `${this.linePath()} L${c[c.length - 1].x},${bottom} L${c[0].x},${bottom} Z`;
  });

  protected readonly active = computed(() => {
    const index = this.hovered();
    return index === null ? null : (this.coords()[index] ?? null);
  });

  protected readonly tooltip = computed(() => {
    const point = this.active();
    if (!point) {
      return null;
    }
    const text = `${point.label} · ${point.value}${this.unit() ? ' ' + this.unit() : ''}`;
    const boxWidth = text.length * 6.6 + 16;
    const x = Math.min(Math.max(point.x - boxWidth / 2, PAD.left), WIDTH - PAD.right - boxWidth);
    return { text, x, y: Math.max(point.y - 34, 2), width: boxWidth };
  });

  protected readonly plotBottom = PAD.top + this.plotHeight;
  protected readonly plotLeft = PAD.left;
  protected readonly plotRight = WIDTH - PAD.right;
  protected readonly labelY = HEIGHT - 8;

  protected onMove(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || this.points().length === 0) {
      return;
    }
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (x - PAD.left) / this.plotWidth;
    const index = Math.round(ratio * (this.points().length - 1));
    this.hovered.set(Math.min(this.points().length - 1, Math.max(0, index)));
  }

  private yFor(value: number): number {
    return PAD.top + this.plotHeight - (value / this.yMax()) * this.plotHeight;
  }
}

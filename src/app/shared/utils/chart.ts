/** Redondea hacia arriba a un valor "lindo" (1, 1,5, 2, 2,5, 3, 4, 5, 6, 8 × 10ⁿ) que se divide bien en `ticks` tramos. */
export function niceMax(max: number, ticks = 4): number {
  if (max <= 0) {
    return ticks;
  }
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((n) => n * magnitude).find((candidate) => candidate >= raw - 1e-9) ?? raw;
  if (step % 1 !== 0) {
    step = Math.ceil(step); // con valores chicos, ejes de números enteros
  }
  return step * ticks;
}

/** Curva suave que pasa por todos los puntos (Catmull-Rom convertida a Bézier). */
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) {
    return '';
  }
  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
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

/** Cada cuántas etiquetas del eje X se muestra una, para que no se superpongan. */
export function labelStep(count: number, maxLabels = 12): number {
  return Math.max(1, Math.ceil(count / maxLabels));
}

/** Importe abreviado para ejes: 6000 -> "$6k", 24000 -> "$24k", 1500000 -> "$1,5M". */
export function formatMoneyAxis(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}k`;
  }
  return `$${value}`;
}

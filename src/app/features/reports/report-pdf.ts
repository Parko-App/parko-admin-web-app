import type { jsPDF } from 'jspdf';
import { formatDateAr, formatTimeAr } from '../../shared/utils/argentina-time';
import { labelStep, niceMax, formatMoneyAxis } from '../../shared/utils/chart';
import { formatDayFull, formatDayShort } from '../../shared/utils/dates';
import { formatPesos } from '../../shared/receipt/receipt-pdf';
import { REPORT_TYPE_LABELS } from '../../core/models/report.model';
import { ReportResult, reportTitle } from './report-export';

type Rgb = [number, number, number];

const PRIMARY: Rgb = [43, 87, 151];
const TEXT: Rgb = [30, 42, 56];
const MUTED: Rgb = [107, 122, 141];
const BORDER: Rgb = [209, 220, 232];
const HEADER_BG: Rgb = [240, 244, 248];
const SUCCESS: Rgb = [22, 163, 74];
const ORANGE: Rgb = [234, 88, 12];
const DANGER: Rgb = [220, 38, 38];
const INFO: Rgb = [37, 99, 235];

const HIGH_OCCUPANCY_PERCENT = 90;

interface Series {
  name: string;
  color: Rgb;
  values: number[];
}

type ChartKind = 'stacked' | 'grouped' | 'line';

interface Table {
  headers: string[];
  rows: string[][];
  /** Columnas alineadas a la derecha (números). */
  numeric: boolean[];
  /** Filas a resaltar en rojo (por ejemplo, ocupación alta). */
  highlight?: boolean[];
}

const PAGE = { width: 210, height: 297, margin: 15 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

const number = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 1 });

/** Genera el PDF de un reporte (A4): título, resumen, gráfico y tabla con todos los días. */
export async function buildReportPdf(result: ReportResult, now = new Date()): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const view = describe(result);

  let y = PAGE.margin;
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...PRIMARY);
  doc.text('PARKO', PAGE.margin, y + 5);
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(...MUTED);
  const generated = `Generado el ${formatDateAr(now.toISOString())} a las ${formatTimeAr(now.toISOString())}`;
  doc.text(generated, PAGE.width - PAGE.margin, y + 5, { align: 'right' });

  y += 14;
  doc.setDrawColor(...BORDER).setLineWidth(0.3).line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
  y += 9;
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...TEXT);
  doc.text(`Reporte de ${REPORT_TYPE_LABELS[result.type]}`, PAGE.margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED);
  doc.text(`Período: ${formatDayFull(result.range.from)} al ${formatDayFull(result.range.to)}`, PAGE.margin, y);

  // Resumen
  y += 9;
  if (view.summary.length > 0) {
    const gap = 4;
    const boxWidth = (CONTENT_WIDTH - gap * (view.summary.length - 1)) / view.summary.length;
    view.summary.forEach(([label, value], index) => {
      const x = PAGE.margin + index * (boxWidth + gap);
      doc.setDrawColor(...BORDER).setFillColor(...HEADER_BG).roundedRect(x, y, boxWidth, 17, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED).text(label, x + 3, y + 6);
      doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...TEXT).text(value, x + 3, y + 13);
    });
    y += 24;
  }

  // Gráfico
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...TEXT).text(view.chartTitle, PAGE.margin, y);
  y += 4;
  drawChart(doc, view, PAGE.margin, y, CONTENT_WIDTH, 62);
  y += 62 + 12;

  // Tabla (con encabezado repetido en cada página)
  drawTable(doc, view.table, y);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
    doc.text('Parko - Reporte generado desde el panel de administración', PAGE.margin, PAGE.height - 8);
    doc.text(`Página ${page} de ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 8, { align: 'right' });
  }

  doc.setProperties({ title: reportTitle(result), subject: 'Reporte Parko', creator: 'Parko' });
  return doc.output('blob');
}

interface View {
  summary: [string, string][];
  chartTitle: string;
  kind: ChartKind;
  labels: string[];
  series: Series[];
  moneyAxis: boolean;
  /** Línea horizontal de referencia (capacidad). */
  reference?: { label: string; value: number };
  table: Table;
}

function describe(result: ReportResult): View {
  switch (result.type) {
    case 'OCCUPANCY': {
      const { capacity, days } = result.data;
      const percent = (value: number) => (capacity > 0 ? (value / capacity) * 100 : 0);
      const peak = Math.max(...days.map((d) => d.peak));
      const average = days.reduce((sum, d) => sum + d.average, 0) / days.length;
      return {
        summary: [
          ['Capacidad total', `${number(capacity)} lugares`],
          ['Ocupación pico', `${number(peak)} (${number(percent(peak))}%)`],
          ['Ocupación promedio', `${number(average)} (${number(percent(average))}%)`],
        ],
        chartTitle: 'Ocupación por día (vehículos)',
        kind: 'line',
        labels: days.map((d) => formatDayShort(d.date)),
        series: [
          { name: 'Pico', color: PRIMARY, values: days.map((d) => d.peak) },
          { name: 'Promedio', color: SUCCESS, values: days.map((d) => d.average) },
        ],
        moneyAxis: false,
        reference: { label: 'Capacidad', value: capacity },
        table: {
          headers: ['Fecha', 'Ocup. pico', 'Ocup. promedio', '% Cap. pico', '% Cap. promedio'],
          rows: days.map((d) => [
            formatDayFull(d.date),
            number(d.peak),
            number(d.average),
            `${number(percent(d.peak))}%`,
            `${number(percent(d.average))}%`,
          ]),
          numeric: [false, true, true, true, true],
          highlight: days.map((d) => percent(d.peak) >= HIGH_OCCUPANCY_PERCENT),
        },
      };
    }
    case 'REVENUE': {
      const { days } = result.data;
      const totals = days.map((d) => d.registered + d.visitors);
      const total = totals.reduce((sum, value) => sum + value, 0);
      const best = totals.indexOf(Math.max(...totals));
      return {
        summary: [
          ['Total del período', formatPesos(total)],
          ['Promedio diario', formatPesos(Math.round(total / days.length))],
          ['Mejor día', `${formatDayFull(days[best].date)} (${formatPesos(totals[best])})`],
        ],
        chartTitle: 'Recaudación por día (pesos)',
        kind: 'stacked',
        labels: days.map((d) => formatDayShort(d.date)),
        series: [
          { name: 'Registrados', color: PRIMARY, values: days.map((d) => d.registered) },
          { name: 'Visitantes', color: ORANGE, values: days.map((d) => d.visitors) },
        ],
        moneyAxis: true,
        table: {
          headers: ['Fecha', 'Registrados', 'Visitantes', 'Total'],
          rows: days.map((d, i) => [formatDayFull(d.date), formatPesos(d.registered), formatPesos(d.visitors), formatPesos(totals[i])]),
          numeric: [false, true, true, true],
        },
      };
    }
    case 'ACCESS': {
      const { days } = result.data;
      const sum = (pick: (d: (typeof days)[number]) => number) => days.reduce((acc, d) => acc + pick(d), 0);
      return {
        summary: [
          ['Ingresos', number(sum((d) => d.entries))],
          ['Egresos', number(sum((d) => d.exits))],
          ['Visitantes', number(sum((d) => d.visitors))],
          ['Registrados', number(sum((d) => d.registered))],
        ],
        chartTitle: 'Ingresos y egresos por día',
        kind: 'grouped',
        labels: days.map((d) => formatDayShort(d.date)),
        series: [
          { name: 'Ingresos', color: SUCCESS, values: days.map((d) => d.entries) },
          { name: 'Egresos', color: INFO, values: days.map((d) => d.exits) },
        ],
        moneyAxis: false,
        table: {
          headers: ['Fecha', 'Ingresos', 'Egresos', 'Visitantes', 'Registrados'],
          rows: days.map((d) => [formatDayFull(d.date), number(d.entries), number(d.exits), number(d.visitors), number(d.registered)]),
          numeric: [false, true, true, true, true],
        },
      };
    }
  }
}

/** Gráfico dibujado con formas simples (sin imágenes): grilla, barras o líneas, eje X y leyenda. */
function drawChart(doc: jsPDF, view: View, x: number, y: number, width: number, height: number): void {
  const legendHeight = 7;
  const axisWidth = 14;
  const labelHeight = 6;
  const plot = { x: x + axisWidth, y: y + legendHeight, w: width - axisWidth, h: height - legendHeight - labelHeight };

  const stackedMax = view.series[0].values.map((_, i) => view.series.reduce((sum, s) => sum + s.values[i], 0));
  const dataMax = view.kind === 'stacked' ? Math.max(...stackedMax) : Math.max(...view.series.flatMap((s) => s.values));
  const top = niceMax(Math.max(dataMax, view.reference?.value ?? 0));
  const yOf = (value: number) => plot.y + plot.h - (value / top) * plot.h;

  // Leyenda
  let legendX = x + axisWidth;
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
  const legend = view.series.map((s) => ({ name: s.name, color: s.color }));
  if (view.reference) {
    legend.push({ name: view.reference.label, color: DANGER });
  }
  for (const item of legend) {
    doc.setFillColor(...item.color).rect(legendX, y + 1.5, 3, 3, 'F');
    doc.text(item.name, legendX + 4.5, y + 4);
    legendX += doc.getTextWidth(item.name) + 12;
  }

  // Grilla y eje Y
  doc.setLineWidth(0.15);
  for (let tick = 0; tick <= 4; tick++) {
    const value = (top / 4) * tick;
    const lineY = yOf(value);
    doc.setDrawColor(...BORDER).line(plot.x, lineY, plot.x + plot.w, lineY);
    doc.setFontSize(7.5).setTextColor(...MUTED);
    doc.text(view.moneyAxis ? formatMoneyAxis(value) : number(value), plot.x - 2, lineY + 1, { align: 'right' });
  }

  const count = view.labels.length;
  const slot = plot.w / count;

  if (view.kind === 'line') {
    const px = (i: number) => plot.x + slot * (i + 0.5);
    for (const s of view.series) {
      doc.setDrawColor(...s.color).setLineWidth(0.6);
      for (let i = 1; i < count; i++) {
        doc.line(px(i - 1), yOf(s.values[i - 1]), px(i), yOf(s.values[i]));
      }
      if (count <= 31) {
        doc.setFillColor(...s.color);
        s.values.forEach((value, i) => doc.circle(px(i), yOf(value), 0.7, 'F'));
      }
    }
    if (view.reference) {
      const refY = yOf(view.reference.value);
      doc.setDrawColor(...DANGER).setLineWidth(0.4).setLineDashPattern([1.5, 1.5], 0);
      doc.line(plot.x, refY, plot.x + plot.w, refY);
      doc.setLineDashPattern([], 0);
    }
  } else if (view.kind === 'stacked') {
    const barWidth = Math.min(slot * 0.7, 10);
    for (let i = 0; i < count; i++) {
      let base = 0;
      for (const s of view.series) {
        const barTop = yOf(base + s.values[i]);
        doc.setFillColor(...s.color).rect(plot.x + slot * i + (slot - barWidth) / 2, barTop, barWidth, yOf(base) - barTop, 'F');
        base += s.values[i];
      }
    }
  } else {
    const group = Math.min(slot * 0.8, 14);
    const barWidth = group / view.series.length;
    for (let i = 0; i < count; i++) {
      view.series.forEach((s, k) => {
        const barTop = yOf(s.values[i]);
        doc.setFillColor(...s.color).rect(plot.x + slot * i + (slot - group) / 2 + barWidth * k, barTop, barWidth, yOf(0) - barTop, 'F');
      });
    }
  }

  // Eje X
  const step = labelStep(count, 12);
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
  view.labels.forEach((label, i) => {
    if (i % step === 0) {
      doc.text(label, plot.x + slot * (i + 0.5), plot.y + plot.h + 4.5, { align: 'center' });
    }
  });
}

function drawTable(doc: jsPDF, table: Table, startY: number): void {
  const columns = table.headers.length;
  const widths = table.headers.map((_, i) => (i === 0 ? CONTENT_WIDTH * 0.28 : (CONTENT_WIDTH * 0.72) / (columns - 1)));
  const rowHeight = 7;
  const bottom = PAGE.height - 16;
  let y = startY;

  const header = () => {
    doc.setFillColor(...HEADER_BG).rect(PAGE.margin, y, CONTENT_WIDTH, rowHeight, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...MUTED);
    let x = PAGE.margin;
    table.headers.forEach((text, i) => {
      doc.text(text.toUpperCase(), table.numeric[i] ? x + widths[i] - 3 : x + 3, y + 4.8, { align: table.numeric[i] ? 'right' : 'left' });
      x += widths[i];
    });
    y += rowHeight;
  };

  if (y + rowHeight * 3 > bottom) {
    doc.addPage();
    y = PAGE.margin;
  }
  header();
  table.rows.forEach((row, index) => {
    if (y + rowHeight > bottom) {
      doc.addPage();
      y = PAGE.margin;
      header();
    }
    const alert = table.highlight?.[index] ?? false;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...(alert ? DANGER : TEXT));
    let x = PAGE.margin;
    row.forEach((text, i) => {
      doc.text(text, table.numeric[i] ? x + widths[i] - 3 : x + 3, y + 4.8, { align: table.numeric[i] ? 'right' : 'left' });
      x += widths[i];
    });
    doc.setDrawColor(...BORDER).setLineWidth(0.15).line(PAGE.margin, y + rowHeight, PAGE.margin + CONTENT_WIDTH, y + rowHeight);
    y += rowHeight;
  });
}

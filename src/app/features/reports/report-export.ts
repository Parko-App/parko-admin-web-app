import {
  AccessReport,
  DateRange,
  OccupancyReport,
  REPORT_TYPE_LABELS,
  ReportType,
  RevenueReport,
} from '../../core/models/report.model';
import { CsvCell, toCsv } from '../../shared/utils/csv';
import { formatDayFull } from '../../shared/utils/dates';

/** Resultado de generar un reporte: el tipo identifica qué forma tienen los datos. */
export type ReportResult =
  | { type: 'OCCUPANCY'; range: DateRange; data: OccupancyReport }
  | { type: 'REVENUE'; range: DateRange; data: RevenueReport }
  | { type: 'ACCESS'; range: DateRange; data: AccessReport };

const FILE_SLUGS: Record<ReportType, string> = {
  OCCUPANCY: 'ocupacion-historica',
  REVENUE: 'recaudacion',
  ACCESS: 'accesos',
};

/** Decimal con coma, como lo espera Excel configurado en español. */
const decimal = (value: number) => value.toFixed(1).replace('.', ',');

export function hasData(result: ReportResult): boolean {
  return result.data.days.length > 0;
}

export function reportFileName(result: ReportResult, extension: string): string {
  return `reporte-${FILE_SLUGS[result.type]}_${result.range.from}_${result.range.to}.${extension}`;
}

export function reportTitle(result: ReportResult): string {
  return `${REPORT_TYPE_LABELS[result.type]} ${formatDayFull(result.range.from)} - ${formatDayFull(result.range.to)}`;
}

/** CSV del reporte, un renglón por día en orden cronológico. */
export function buildReportCsv(result: ReportResult): string {
  switch (result.type) {
    case 'OCCUPANCY': {
      const { capacity, days } = result.data;
      const percent = (value: number) => decimal(capacity > 0 ? (value / capacity) * 100 : 0);
      return toCsv(
        ['Fecha', 'Ocupación pico', 'Ocupación promedio', '% Cap. pico', '% Cap. promedio'],
        days.map<CsvCell[]>((d) => [formatDayFull(d.date), d.peak, d.average, percent(d.peak), percent(d.average)]),
      );
    }
    case 'REVENUE':
      return toCsv(
        ['Fecha', 'Cargas de saldo', 'Cobros en efectivo', 'Total'],
        result.data.days.map<CsvCell[]>((d) => [formatDayFull(d.date), d.topUps, d.cash, d.topUps + d.cash]),
      );
    case 'ACCESS':
      return toCsv(
        ['Fecha', 'Ingresos', 'Egresos', 'Visitantes', 'Registrados'],
        result.data.days.map<CsvCell[]>((d) => [formatDayFull(d.date), d.entries, d.exits, d.visitors, d.registered]),
      );
  }
}

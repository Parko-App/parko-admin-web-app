/**
 * Contratos SUPUESTOS del módulo de Reportes (a confirmar con el backend).
 * Cada reporte recibe un rango de fechas (AAAA-MM-DD, horario de Argentina) y devuelve un registro por día:
 *   GET admin/reports/occupancy?from=&to=  -> OccupancyReport
 *   GET admin/reports/revenue?from=&to=    -> RevenueReport
 *   GET admin/reports/access?from=&to=     -> AccessReport
 */

export type ReportType = 'OCCUPANCY' | 'REVENUE' | 'ACCESS';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  OCCUPANCY: 'Ocupación histórica',
  REVENUE: 'Recaudación',
  ACCESS: 'Accesos',
};

/** Rango de fechas inclusivo, formato AAAA-MM-DD. */
export interface DateRange {
  from: string;
  to: string;
}

export interface OccupancyDay {
  date: string;
  /** Máxima cantidad de vehículos presentes en el día. */
  peak: number;
  /** Promedio de vehículos presentes en el día. */
  average: number;
}

export interface OccupancyReport {
  /** Capacidad total del estacionamiento (base de los porcentajes). */
  capacity: number;
  days: OccupancyDay[];
}

export interface RevenueDay {
  date: string;
  /** Recaudado de usuarios registrados (en pesos). */
  registered: number;
  /** Recaudado de visitantes (en pesos). */
  visitors: number;
}

export interface RevenueReport {
  days: RevenueDay[];
}

export interface AccessDay {
  date: string;
  entries: number;
  exits: number;
  visitors: number;
  registered: number;
}

export interface AccessReport {
  days: AccessDay[];
}

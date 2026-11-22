/**
 * Modelos de Reportes (admin-service: GET admin/reports/{occupancy|revenue|access}?from=&to=).
 * Los servicios HTTP convierten la respuesta del backend a estas formas. Cada reporte recibe un rango de fechas (AAAA-MM-DD, horario de Argentina) y devuelve un registro por día:
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
  /** Cargas de saldo acreditadas (en efectivo o por Mercado Pago), en pesos. */
  topUps: number;
  /** Cobros de tickets en efectivo, en pesos. */
  cash: number;
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

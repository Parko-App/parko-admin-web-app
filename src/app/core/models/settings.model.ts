/**
 * Contrato SUPUESTO de la configuración del sistema (pendiente de confirmar con backend):
 *   GET admin/settings -> SystemSettings
 *   PUT admin/settings (SystemSettings completo) -> SystemSettings guardado
 * Los importes son pesos por día; los horarios, "HH:mm" en horario de Argentina.
 */
export interface OpeningHours {
  open: string;
  close: string;
}

export interface SystemSettings {
  /** Tarifas diarias en pesos. */
  registeredDailyRate: number;
  visitorDailyRate: number;
  motorcycleDailyRate: number;
  /** Descuento de las motos sobre el automóvil, en porcentaje (0 a 100). */
  motorcycleDiscountPercent: number;
  /** Cantidad máxima de patentes por tipo de usuario. */
  plateLimits: { students: number; teachers: number; staff: number };
  /** Cantidad total de espacios del estacionamiento. */
  totalCapacity: number;
  schedule: { weekdays: OpeningHours; saturday: OpeningHours };
}

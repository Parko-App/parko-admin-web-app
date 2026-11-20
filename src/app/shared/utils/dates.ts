import { ARGENTINA_UTC_OFFSET } from './argentina-time';

/** Las fechas de reportes son cadenas AAAA-MM-DD (día calendario, sin hora ni zona). */
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEKDAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_MS = 24 * 60 * 60 * 1000;

const OFFSET_HOURS = Number(ARGENTINA_UTC_OFFSET.slice(0, 3)); // -3

const parse = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Hoy en Argentina (UTC-3, sin horario de verano). */
export function todayInArgentina(now = Date.now()): string {
  return toIso(now + OFFSET_HOURS * 60 * 60 * 1000);
}

export function addDays(iso: string, days: number): string {
  return toIso(parse(iso) + days * DAY_MS);
}

/** Cantidad de días del rango, ambos extremos incluidos. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to) - parse(from)) / DAY_MS) + 1;
}

/** Todos los días del rango, ambos extremos incluidos. */
export function eachDay(from: string, to: string): string[] {
  return Array.from({ length: Math.max(0, daysBetween(from, to)) }, (_, i) => addDays(from, i));
}

const weekdayIndex = (iso: string) => new Date(parse(iso)).getUTCDay();

/** 2026-09-23 -> "Mié 23/09" */
export function formatDayShort(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${WEEKDAYS[weekdayIndex(iso)]} ${day}/${month}`;
}

/** 2026-09-23 -> "23/09/2026" */
export function formatDayFull(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** 2026-09-26 -> "Jueves 26/09" */
export function formatDayLong(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${WEEKDAYS_LONG[weekdayIndex(iso)]} ${day}/${month}`;
}

export function isWeekend(iso: string): boolean {
  const index = weekdayIndex(iso);
  return index === 0 || index === 6;
}

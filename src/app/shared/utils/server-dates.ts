import { ARGENTINA_UTC_OFFSET } from './argentina-time';

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/;

/**
 * El backend devuelve fechas "locales" sin zona (LocalDateTime: 2026-11-21T10:47:00) que corresponden
 * a la hora de Argentina. Se les agrega el offset (-03:00) para que el resto de la app las trate como
 * instantes ISO 8601 normales.
 */
export function fromServerDateTime(value: string): string;
export function fromServerDateTime(value: string | null | undefined): string | null;
export function fromServerDateTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (HAS_ZONE.test(value)) {
    return value;
  }
  const withSeconds = /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return `${withSeconds}${ARGENTINA_UTC_OFFSET.slice(0, 3)}:${ARGENTINA_UTC_OFFSET.slice(3)}`;
}

/**
 * Argentina no usa horario de verano: America/Argentina/Cordoba es siempre UTC-3.
 * Los pipes y formatos de Angular solo admiten offsets, no nombres IANA.
 */
export const ARGENTINA_UTC_OFFSET = '-0300';

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** "2026-11-20T13:47:00Z" -> "20/11/2026" (hora de Argentina; no depende del idioma registrado en Angular). */
export function formatDateAr(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: ARGENTINA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** "2026-11-20T13:47:00Z" -> "10:47" (24 h, hora de Argentina). */
export function formatTimeAr(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    timeZone: ARGENTINA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

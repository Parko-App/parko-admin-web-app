/**
 * Argentina no usa horario de verano: America/Argentina/Cordoba es siempre UTC-3.
 * Los pipes y formatos de Angular solo admiten offsets, no nombres IANA.
 */
export const ARGENTINA_UTC_OFFSET = '-0300';

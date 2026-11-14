import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Argentina no usa horario de verano: America/Argentina/Cordoba es siempre UTC-3.
 * Angular solo admite offsets en el parámetro timezone, no nombres IANA.
 */
const ARGENTINA_UTC_OFFSET = '-0300';

/**
 * Formatea fechas con el formato regional argentino.
 * Uso: {{ fecha | dateTimeAr }} -> 13/11/2026 18:38
 *      {{ fecha | dateTimeAr:'date' }} -> 13/11/2026
 */
@Pipe({ name: 'dateTimeAr' })
export class DateTimeArPipe implements PipeTransform {
  transform(value: Date | string | number | null | undefined, mode: 'date' | 'dateTime' = 'dateTime'): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const format = mode === 'date' ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm';
    return formatDate(value, format, 'es-AR', ARGENTINA_UTC_OFFSET);
  }
}

import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { ARGENTINA_UTC_OFFSET } from '../utils/argentina-time';

/**
 * Formatea fechas con el formato regional argentino.
 * Uso: {{ fecha | dateTimeAr }} -> 13/11/2026 18:38
 *      {{ fecha | dateTimeAr:'date' }} -> 13/11/2026
 *      {{ fecha | dateTimeAr:'time' }} -> 18:38
 */
@Pipe({ name: 'dateTimeAr' })
export class DateTimeArPipe implements PipeTransform {
  transform(value: Date | string | number | null | undefined, mode: 'date' | 'time' | 'dateTime' = 'dateTime'): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const format = mode === 'date' ? 'dd/MM/yyyy' : mode === 'time' ? 'HH:mm' : 'dd/MM/yyyy HH:mm';
    return formatDate(value, format, 'es-AR', ARGENTINA_UTC_OFFSET);
  }
}

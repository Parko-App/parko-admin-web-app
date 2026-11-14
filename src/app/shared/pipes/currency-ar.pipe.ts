import { formatNumber } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea importes en pesos argentinos, como en el diseño: $18.340 / $6.200,50 / -$1.500.
 * Uso: {{ valor | currencyAr }} o {{ valor | currencyAr:'1.2-2' }}
 */
@Pipe({ name: 'currencyAr' })
export class CurrencyArPipe implements PipeTransform {
  transform(value: number | string | null | undefined, digitsInfo = '1.0-2'): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const amount = Number(value);
    const formatted = formatNumber(Math.abs(amount), 'es-AR', digitsInfo);
    return `${amount < 0 ? '-' : ''}$${formatted}`;
  }
}

import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { CurrencyArPipe } from './currency-ar.pipe';

describe('CurrencyArPipe', () => {
  const pipe = new CurrencyArPipe();
  beforeAll(() => registerLocaleData(localeEsAr, 'es-AR'));

  it('formatea pesos con separador de miles local', () => {
    expect(pipe.transform(18340, '1.0-0')).toBe('$18.340');
  });

  it('formatea centavos con coma decimal', () => {
    expect(pipe.transform(6200.5, '1.2-2')).toBe('$6.200,50');
  });

  it('formatea importes negativos', () => {
    expect(pipe.transform(-1500)).toBe('-$1.500');
  });

  it('devuelve vacío para valores nulos', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});

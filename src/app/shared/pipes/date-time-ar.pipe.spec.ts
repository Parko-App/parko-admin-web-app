import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { DateTimeArPipe } from './date-time-ar.pipe';

describe('DateTimeArPipe', () => {
  const pipe = new DateTimeArPipe();
  beforeAll(() => registerLocaleData(localeEsAr, 'es-AR'));

  it('formatea fecha y hora en horario de Argentina (UTC-3)', () => {
    expect(pipe.transform('2026-11-13T21:38:00Z')).toBe('13/11/2026 18:38');
  });

  it('formatea solo la fecha', () => {
    expect(pipe.transform('2026-11-13T21:38:00Z', 'date')).toBe('13/11/2026');
  });

  it('devuelve vacío para valores nulos', () => {
    expect(pipe.transform(null)).toBe('');
  });
});

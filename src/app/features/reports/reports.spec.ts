import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ToastService } from '../../core/notifications/toast.service';
import { AccessReport, DateRange, OccupancyReport, RevenueReport } from '../../core/models/report.model';
import { niceMax, formatMoneyAxis } from '../../shared/utils/chart';
import { toCsv } from '../../shared/utils/csv';
import { addDays, daysBetween, eachDay, formatDayFull, formatDayLong, formatDayShort, todayInArgentina } from '../../shared/utils/dates';
import { buildReportCsv, reportFileName } from './report-export';
import { MOCK_CAPACITY, MockReportsService, ReportsService } from './reports.service';
import { ReportsComponent } from './reports.component';

registerLocaleData(localeEsAr, 'es-AR');

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup(service: ReportsService = new MockReportsService()) {
  TestBed.configureTestingModule({
    imports: [ReportsComponent],
    providers: [{ provide: ReportsService, useValue: service }, { provide: LOCALE_ID, useValue: 'es-AR' }],
  });
  const fixture = TestBed.createComponent(ReportsComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async (ms = 20) => {
    await tick(ms);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();
  const setValue = (selector: string, value: string, eventName = 'input') => {
    const control = el.querySelector(selector) as HTMLInputElement | HTMLSelectElement;
    control.value = value;
    control.dispatchEvent(new Event(eventName));
  };
  const generate = async (type: string, from = '2026-09-23', to = '2026-09-29') => {
    setValue('#report-type', type, 'change');
    setValue('#report-from', from);
    setValue('#report-to', to);
    (el.querySelector('form.filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
  };
  const click = (selector: string) => (el.querySelector(selector) as HTMLElement).click();
  const cells = (column: number) =>
    Array.from(el.querySelectorAll('.report-table tbody tr')).map((tr) => tr.children[column].textContent?.trim());
  return { fixture, el, settle, setValue, generate, click, cells };
}

describe('utilidades de fechas', () => {
  it('da formato a los días con el nombre abreviado', () => {
    expect(formatDayShort('2026-09-23')).toBe('Mié 23/09');
    expect(formatDayFull('2026-09-23')).toBe('23/09/2026');
    expect(formatDayLong('2026-09-24')).toBe('Jueves 24/09');
  });

  it('suma días entre meses y cuenta rangos inclusivos', () => {
    expect(addDays('2026-09-28', 5)).toBe('2026-10-03');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-09-23', '2026-09-29')).toBe(7);
    expect(eachDay('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  });

  it('calcula "hoy" en horario de Argentina (UTC-3)', () => {
    expect(todayInArgentina(Date.parse('2026-11-20T02:00:00Z'))).toBe('2026-11-19');
    expect(todayInArgentina(Date.parse('2026-11-20T03:00:00Z'))).toBe('2026-11-20');
  });
});

describe('utilidades de CSV y gráficos', () => {
  it('arma un CSV para Excel (BOM, punto y coma, comillas)', () => {
    expect(toCsv(['A', 'B'], [['x;y', 'dice "hola"'], [1, null]])).toBe('﻿A;B\r\n"x;y";"dice ""hola"""\r\n1;\r\n');
  });

  it('redondea el eje a valores lindos', () => {
    expect(niceMax(0)).toBe(4);
    expect(niceMax(22500)).toBe(24000);
    expect(niceMax(351)).toBe(400);
    expect(niceMax(5)).toBe(8);
    expect(formatMoneyAxis(24000)).toBe('$24k');
    expect(formatMoneyAxis(1500000)).toBe('$1,5M');
  });
});

describe('exportación', () => {
  const range: DateRange = { from: '2026-09-23', to: '2026-09-24' };

  it('genera el CSV de ocupación con porcentajes sobre la capacidad', () => {
    const data: OccupancyReport = { capacity: 200, days: [{ date: '2026-09-23', peak: 150, average: 100 }] };
    expect(buildReportCsv({ type: 'OCCUPANCY', range, data })).toBe(
      '﻿Fecha;Ocupación pico;Ocupación promedio;% Cap. pico;% Cap. promedio\r\n23/09/2026;150;100;75,0;50,0\r\n',
    );
  });

  it('genera el CSV de recaudación con el total y el de accesos', () => {
    const revenue: RevenueReport = { days: [{ date: '2026-09-23', topUps: 8400, cash: 12300 }] };
    expect(buildReportCsv({ type: 'REVENUE', range, data: revenue })).toBe(
      '﻿Fecha;Cargas de saldo;Cobros en efectivo;Total\r\n23/09/2026;8400;12300;20700\r\n',
    );
    const access: AccessReport = { days: [{ date: '2026-09-23', entries: 335, exits: 114, visitors: 34, registered: 301 }] };
    expect(buildReportCsv({ type: 'ACCESS', range, data: access })).toBe(
      '﻿Fecha;Ingresos;Egresos;Visitantes;Registrados\r\n23/09/2026;335;114;34;301\r\n',
    );
  });

  it('nombra el archivo con el tipo y el rango', () => {
    expect(reportFileName({ type: 'REVENUE', range, data: { days: [] } }, 'csv')).toBe(
      'reporte-recaudacion_2026-09-23_2026-09-24.csv',
    );
  });
});

describe('ReportsComponent', () => {
  it('al abrir genera la ocupación histórica de los últimos 7 días', async () => {
    const { el, cells } = await setup();
    expect(el.querySelector('h2')?.textContent).toContain('Ocupación histórica');
    expect(cells(0).length).toBe(7);
    expect(el.querySelector('#report-to')).not.toBeNull();
    expect((el.querySelector('#report-to') as HTMLInputElement).value).toBe(todayInArgentina());
    expect((el.querySelector('#report-from') as HTMLInputElement).value).toBe(addDays(todayInArgentina(), -6));
  });

  it('ocupación: tabla con porcentajes sobre la capacidad y días críticos en rojo', async () => {
    const { el, generate, cells } = await setup();
    await generate('OCCUPANCY');
    const headers = Array.from(el.querySelectorAll('.report-table th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Fecha', 'Ocupación pico', 'Ocupación promedio', '% Cap. pico', '% Cap. promedio']);
    expect(cells(0)[0]).toBe('Mié 23/09');
    const firstPeak = Number(cells(1)[0]);
    const expected = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format((firstPeak / MOCK_CAPACITY) * 100);
    expect(cells(3)[0]).toBe(`${expected}%`);
    expect(el.querySelector('.report-table .danger')).not.toBeNull(); // algún día supera el 90 %
    expect(el.querySelector('app-bar-chart svg')).not.toBeNull();
  });

  it('recaudación: calcula total, promedio diario y mejor día con los datos', async () => {
    const { el, generate, cells } = await setup();
    await generate('REVENUE');
    const kpis = Array.from(el.querySelectorAll('app-kpi-card')).map((card) => card.textContent!);
    expect(kpis.length).toBe(3);
    const totals = cells(3).map((text) => Number(text!.replace(/[$.]/g, '')));
    const sum = totals.reduce((a, b) => a + b, 0);
    expect(kpis[0]).toContain(`$${new Intl.NumberFormat('es-AR').format(sum)}`);
    expect(kpis[1]).toContain(`$${new Intl.NumberFormat('es-AR').format(Math.round(sum / 7))}`);
    const best = Math.max(...totals);
    expect(kpis[2]).toContain(`$${new Intl.NumberFormat('es-AR').format(best)} recaudados`);
    // cada renglón: total = cargas de saldo + cobros en efectivo
    const topUps = cells(1).map((t) => Number(t!.replace(/[$.]/g, '')));
    const cash = cells(2).map((t) => Number(t!.replace(/[$.]/g, '')));
    expect(totals).toEqual(topUps.map((r, i) => r + cash[i]));
  });

  it('accesos: muestra ingresos, egresos, visitantes y registrados', async () => {
    const { el, generate, cells } = await setup();
    await generate('ACCESS');
    expect(el.querySelector('h2')?.textContent).toContain('Accesos');
    expect(cells(0)[0]).toBe('23/09/2026');
    const entries = cells(1).map(Number);
    const visitors = cells(3).map(Number);
    const registered = cells(4).map(Number);
    expect(registered).toEqual(entries.map((e, i) => e - visitors[i]));
    expect(el.querySelectorAll('app-multi-line-chart path.chart__line').length).toBe(3);
    expect(el.querySelector('app-multi-line-chart')?.textContent).toContain('Egresos');
  });

  it('cada columna de las tablas se puede ordenar', async () => {
    const { el, generate, cells, click, settle } = await setup();
    await generate('OCCUPANCY');
    click('th[appSortHeader="peak"] button');
    await settle();
    const ascending = cells(1).map(Number);
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    click('th[appSortHeader="peak"] button');
    await settle();
    expect(cells(1).map(Number)).toEqual([...ascending].reverse());
    expect(el.querySelector('th[appSortHeader="peak"]')?.getAttribute('aria-sort')).toBe('descending');
    click('th[appSortHeader="date"] button');
    await settle();
    expect(cells(0)[0]).toBe('Mié 23/09');

    await generate('REVENUE');
    click('th[appSortHeader="total"] button');
    await settle();
    const totals = cells(3).map((text) => Number(text!.replace(/[$.]/g, '')));
    expect(totals).toEqual([...totals].sort((a, b) => a - b));

    await generate('ACCESS');
    click('th[appSortHeader="visitors"] button');
    await settle();
    const visitors = cells(3).map(Number);
    expect(visitors).toEqual([...visitors].sort((a, b) => a - b));
  });

  it('valida el rango de fechas', async () => {
    const { el, setValue, settle } = await setup();
    const submit = async () => {
      (el.querySelector('form.filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await settle();
    };
    setValue('#report-from', '2026-09-29');
    setValue('#report-to', '2026-09-23');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('"Desde" no puede ser posterior');
    setValue('#report-from', '2026-01-01');
    setValue('#report-to', '2999-01-01');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('no puede ser futura');
    setValue('#report-from', '2020-01-01');
    setValue('#report-to', '2022-01-01');
    await submit();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('366 días');
  });

  it('exporta el CSV del reporte generado', async () => {
    const { generate, click, settle } = await setup();
    await generate('REVENUE');
    let blob: Blob | undefined;
    URL.createObjectURL = (b: Blob | MediaSource) => {
      blob = b as Blob;
      return 'blob:test';
    };
    URL.revokeObjectURL = () => undefined;
    let downloaded = '';
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      downloaded = this.download;
    };
    try {
      click('.filters__export .btn:first-child');
      await settle();
    } finally {
      HTMLAnchorElement.prototype.click = original;
    }
    expect(downloaded).toBe('reporte-recaudacion_2026-09-23_2026-09-29.csv');
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob!);
    });
    expect(text).toContain('Fecha;Cargas de saldo;Cobros en efectivo;Total');
    expect(text.split('\r\n').length).toBe(9); // encabezado + 7 días + salto final
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe('Se descargó el reporte en CSV.');
  });

  it('exporta a PDF descargándolo directo, sin abrir el diálogo de impresión', async () => {
    const { generate, click, settle } = await setup();
    for (const type of ['OCCUPANCY', 'REVENUE', 'ACCESS'] as const) {
      await generate(type);
      let downloaded = '';
      let blob: Blob | undefined;
      const create = URL.createObjectURL;
      URL.createObjectURL = (b: Blob | MediaSource) => {
        blob = b as Blob;
        return 'blob:pdf';
      };
      const anchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        downloaded = this.download;
      };
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
      try {
        click('.filters__export .btn:last-child');
        await settle(400);
      } finally {
        URL.createObjectURL = create;
        HTMLAnchorElement.prototype.click = anchorClick;
      }
      expect(printSpy).not.toHaveBeenCalled();
      printSpy.mockRestore();
      expect(downloaded).toMatch(/^reporte-.*\.pdf$/);
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob!.slice(0, 8));
      });
      expect(text.startsWith('%PDF')).toBe(true);
    }
    expect(TestBed.inject(ToastService).toasts().some((t) => t.message === 'Se descargó el reporte en PDF.')).toBe(true);
  });

  it('sin datos muestra el estado vacío y no permite exportar', async () => {
    const empty: ReportsService = {
      occupancy: () => of({ capacity: MOCK_CAPACITY, days: [] }),
      revenue: () => of({ days: [] }),
      access: () => of({ days: [] }),
    };
    const { el } = await setup(empty);
    expect(el.textContent).toContain('No hay datos para el período seleccionado');
    for (const button of Array.from(el.querySelectorAll('.filters__export .btn'))) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('ante un error del servidor ofrece reintentar', async () => {
    let fail = true;
    const flaky: ReportsService = {
      occupancy: (): Observable<OccupancyReport> =>
        fail ? throwError(() => new Error('boom')) : of({ capacity: MOCK_CAPACITY, days: [{ date: '2026-09-23', peak: 10, average: 5 }] }),
      revenue: () => of({ days: [] }),
      access: () => of({ days: [] }),
    };
    const { el, click, settle } = await setup(flaky);
    expect(el.textContent).toContain('Ocurrió un error inesperado.');
    fail = false;
    click('app-error-state button');
    await settle();
    expect(el.querySelectorAll('.report-table tbody tr').length).toBe(1);
  });
});

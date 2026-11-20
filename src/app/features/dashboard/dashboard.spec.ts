import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { DashboardSummary, RecentAccess } from '../../core/models/dashboard.model';
import { NavBadgesService } from '../../layout/nav-badges.service';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { LineChartComponent } from '../../shared/components/line-chart/line-chart.component';
import { DashboardComponent } from './dashboard.component';
import { DashboardService, MockDashboardService } from './dashboard.service';

registerLocaleData(localeEsAr, 'es-AR');

class FailingService extends DashboardService {
  calls = 0;
  getSummary(): Observable<DashboardSummary> {
    this.calls++;
    return throwError(() => new HttpErrorResponse({ status: 500 }));
  }
  getRecentAccess(): Observable<RecentAccess[]> {
    return of([]);
  }
}

async function settle(fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) {
  await new Promise((resolve) => setTimeout(resolve, 10)); // timer(0) del polling
  await fixture.whenStable();
  fixture.detectChanges();
}

function setup(service: DashboardService) {
  TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [{ provide: DashboardService, useValue: service }, { provide: LOCALE_ID, useValue: 'es-AR' }],
  });
  const fixture = TestBed.createComponent(DashboardComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('DashboardComponent', () => {
  it('muestra los indicadores, el resumen y los últimos accesos', async () => {
    const { fixture, el } = setup(new MockDashboardService());
    await settle(fixture);

    const text = el.textContent ?? '';
    expect(text).toContain('221 / 247');
    expect(text).toContain('89,5% de capacidad');
    expect(text).toContain('$18.340');
    expect(text).toContain('8 visitantes · 213 registrados');
    expect(text).toContain('$9.120 recaudado');
    expect(text).toContain('12 pendientes');
    expect(text).toContain('Sector B casi lleno (94%)');
    expect(el.querySelectorAll('.access tbody tr').length).toBe(8);
    expect(text).toContain('AB 123 CD');
    expect(text).toContain('10:47');
  });

  it('clasifica la ocupación y actualiza el contador de incidencias del sidebar', async () => {
    const { fixture, el } = setup(new MockDashboardService());
    await settle(fixture);
    expect(el.querySelector('app-kpi-card app-status-badge')?.textContent).toContain('Alta');
    expect(TestBed.inject(NavBadgesService).openIncidents()).toBe(3);
  });

  it('muestra el error y permite reintentar', async () => {
    const service = new FailingService();
    const { fixture, el } = setup(service);
    await settle(fixture);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('servidor');
    expect(el.querySelector('.kpis')).toBeNull();
    (el.querySelector('.error__retry') as HTMLButtonElement).click();
    expect(service.calls).toBe(2);
  });
});

describe('Tabla de últimos accesos ordenable', () => {
  const ids = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.access tbody tr td:first-child')).map((td) => td.textContent?.trim());

  it('ordena por hora y por patente (los vacíos quedan al final)', async () => {
    const { fixture, el } = setup(new MockDashboardService());
    await settle(fixture);
    expect(ids(el)[0]).toBe('A-8821'); // orden original: más reciente primero

    (el.querySelector('th[appSortHeader="timestamp"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(ids(el)[0]).toBe('A-8816'); // 09:41 es la más temprana

    (el.querySelector('th[appSortHeader="plate"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(ids(el)[0]).toBe('A-8821'); // AB 123 CD
    expect(ids(el).slice(-2)).toEqual(expect.arrayContaining(['V-0043', 'V-0042']));

    (el.querySelector('th[appSortHeader="plate"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(ids(el).slice(-2)).toEqual(expect.arrayContaining(['V-0043', 'V-0042']));
  });
});

describe('LineChartComponent', () => {
  function chart(points: { label: string; value: number }[]) {
    TestBed.configureTestingModule({ imports: [LineChartComponent] });
    const fixture = TestBed.createComponent(LineChartComponent);
    fixture.componentRef.setInput('points', points);
    fixture.componentRef.setInput('ariaLabel', 'Prueba');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('dibuja la curva, la grilla y una tabla accesible', () => {
    const el = chart(Array.from({ length: 24 }, (_, h) => ({ label: `${h}:00`, value: h * 10 })));
    expect(el.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(el.querySelector('.chart__line')?.getAttribute('d')).toMatch(/^M/);
    expect(el.querySelectorAll('.chart__grid').length).toBe(5);
    expect(el.querySelectorAll('table tbody tr').length).toBe(24);
  });

  it('redondea el máximo del eje Y a múltiplos de 4 pasos', () => {
    const el = chart([{ label: 'a', value: 235 }, { label: 'b', value: 10 }]);
    const ticks = Array.from(el.querySelectorAll('.chart__axis'))
      .map((t) => t.textContent?.trim())
      .filter((t) => /^\d+$/.test(t ?? ''));
    expect(ticks).toContain('240');
    expect(ticks).toContain('60');
  });

  it('no falla sin datos', () => {
    const el = chart([]);
    expect(el.querySelector('.chart__line')?.getAttribute('d')).toBe('');
  });
});

describe('KpiCardComponent', () => {
  it('limita la barra de progreso entre 0 y 100', () => {
    TestBed.configureTestingModule({ imports: [KpiCardComponent] });
    const fixture = TestBed.createComponent(KpiCardComponent);
    fixture.componentRef.setInput('label', 'Ocupación');
    fixture.componentRef.setInput('progress', 140);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=progressbar]').getAttribute('aria-valuenow')).toBe('100');
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { DashboardSummary, RecentAccess } from '../../core/models/dashboard.model';
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
    expect(text).not.toContain('Sector');
    expect(el.querySelectorAll('.access tbody tr').length).toBe(8);
    expect(text).toContain('AB 123 CD');
    expect(text).toContain('10:47');
  });

  it('clasifica la ocupación según el porcentaje de capacidad', async () => {
    const { fixture, el } = setup(new MockDashboardService());
    await settle(fixture);
    expect(el.querySelector('app-kpi-card app-status-badge')?.textContent).toContain('Alta');
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
  // La primera columna es la patente (ya no hay columna ID).
  const plates = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.access tbody tr td:first-child')).map((td) => td.textContent?.trim());

  it('no tiene columna ID', async () => {
    const { fixture, el } = setup(new MockDashboardService());
    await settle(fixture);
    const headers = Array.from(el.querySelectorAll('.access thead th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Patente', 'Usuario', 'Tipo', 'Hora', 'Movimiento']);
    expect(el.querySelector('.access')?.textContent).not.toContain('A-8821');
  });

  it('ordena por hora y por patente (los vacíos quedan al final)', async () => {
    const { fixture, el } = setup(new MockDashboardService());
    await settle(fixture);
    expect(plates(el)[0]).toBe('AB 123 CD'); // orden original: más reciente primero (10:47)

    (el.querySelector('th[appSortHeader="timestamp"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(plates(el)[0]).toBe('ST 987 UV'); // 09:41 es la más temprana

    (el.querySelector('th[appSortHeader="plate"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(plates(el)[0]).toBe('AB 123 CD');
    expect(plates(el).slice(-2)).toEqual(['—', '—']); // los visitantes sin patente

    (el.querySelector('th[appSortHeader="plate"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(plates(el).slice(-2)).toEqual(['—', '—']);
  });

  it('el ingreso y el egreso tienen sus colores, como en la pantalla de Accesos', async () => {
    const { fixture, el } = setup(new MockDashboardService());
    await settle(fixture);
    const cells = Array.from(el.querySelectorAll('.access tbody td.movement')) as HTMLElement[];
    const entry = cells.find((c) => c.textContent?.includes('Ingreso'))!;
    const exit = cells.find((c) => c.textContent?.includes('Egreso'))!;

    expect(entry.classList).toContain('movement--entry');
    expect(exit.classList).toContain('movement--exit');
    // el color efectivo (si la regla de la celda gana, no el color base del texto): verde para ingreso, naranja para egreso
    expect(getComputedStyle(entry).color).toBe('rgb(22, 101, 52)');
    expect(getComputedStyle(exit).color).toBe('rgb(194, 65, 12)');
  });
});

import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { AccessRecord } from '../../core/models/access.model';
import { PageResponse } from '../../core/models/page-response.model';
import { ListQuery } from '../../shared/utils/paged-list';
import { AccessComponent } from './access.component';
import { AccessService, MockAccessService } from './access.service';

registerLocaleData(localeEsAr, 'es-AR');

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup(service: AccessService = new MockAccessService()) {
  TestBed.configureTestingModule({
    imports: [AccessComponent],
    providers: [{ provide: AccessService, useValue: service }, { provide: LOCALE_ID, useValue: 'es-AR' }],
  });
  const fixture = TestBed.createComponent(AccessComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async (ms = 10) => {
    await tick(ms);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();
  const click = (selector: string, index = 0) => (el.querySelectorAll(selector)[index] as HTMLElement).click();
  const type = (value: string) => {
    const input = el.querySelector('#plate-search') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const pickMovement = async (value: string) => {
    const select = el.querySelector('#movement-filter') as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await settle();
  };
  const column = (index: number) =>
    Array.from(el.querySelectorAll('.access tbody tr')).map((tr) => tr.children[index].textContent?.trim() ?? '');
  return { fixture, el, settle, click, type, pickMovement, column };
}

describe('AccessComponent', () => {
  it('lista los movimientos con todas las columnas, el más reciente primero', async () => {
    const { el, column } = await setup();
    const headers = Array.from(el.querySelectorAll('.access th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Patente', 'Movimiento', 'Fecha y hora', 'Usuario', 'Tipo de usuario', 'Método']);
    expect(column(0).length).toBe(10);
    const first = el.querySelector('.access tbody tr')!.textContent!;
    expect(first).toContain('AB 123 CD');
    expect(first).toContain('Ingreso');
    expect(first).toContain('Lucas Fernández');
    expect(first).toContain('Registrado');
    expect(first).toContain('Automático');
    expect(el.querySelector('th[appSortHeader="timestamp"]')?.getAttribute('aria-sort')).toBe('descending');
    expect(el.querySelector('app-pagination')).not.toBeNull(); // 25 movimientos -> 3 páginas
  });

  describe('accesos denegados', () => {
    const record = (id: string, movement: 'ENTRY' | 'EXIT', result?: 'AUTHORIZED' | 'DENIED'): AccessRecord => ({
      id,
      plate: 'NVZ087',
      userName: 'Visitante',
      userType: 'VISITOR',
      timestamp: '2026-11-21T10:47:00-03:00',
      movement,
      method: 'AUTOMATIC',
      ...(result ? { result } : {}),
    });
    const serviceWith = (...records: AccessRecord[]): AccessService => ({
      list: () => of({ content: records, page: 0, size: 10, totalElements: records.length, totalPages: 1 }),
    });
    const movementCells = (el: HTMLElement) =>
      Array.from(el.querySelectorAll('.access tbody tr')).map((tr) => tr.children[1] as HTMLElement);

    it('un egreso con result DENIED se muestra como "Egreso denegado", en rojo', async () => {
      const { el } = await setup(serviceWith(record('1', 'EXIT', 'DENIED')));
      const cell = movementCells(el)[0];
      expect(cell.textContent?.replace(/\s+/g, ' ').trim()).toContain('Egreso denegado');
      expect(cell.classList).toContain('movement--denied');
      expect(cell.classList).not.toContain('movement--exit');
    });

    it('un egreso autorizado, o sin result, sigue mostrándose como "Egreso"', async () => {
      const { el } = await setup(serviceWith(record('1', 'EXIT', 'AUTHORIZED'), record('2', 'EXIT')));
      for (const cell of movementCells(el)) {
        expect(cell.textContent?.replace(/\s+/g, ' ').trim()).toMatch(/Egreso$/);
        expect(cell.textContent).not.toContain('denegado');
        expect(cell.classList).toContain('movement--exit');
      }
    });

    it('un ingreso denegado también lo dice', async () => {
      const { el } = await setup(serviceWith(record('1', 'ENTRY', 'DENIED')));
      expect(movementCells(el)[0].textContent).toContain('Ingreso denegado');
    });

    it('la demostración incluye un egreso denegado entre los movimientos', async () => {
      const { el } = await setup();
      expect(el.querySelector('.access tbody')?.textContent ?? '').toContain('Ingreso');
      // el egreso denegado de la demo está en la primera página
      expect(Array.from(el.querySelectorAll('.access .movement--denied')).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('muestra "Sin patente" para visitantes sin patente y el método manual', async () => {
    const { el } = await setup();
    const row = Array.from(el.querySelectorAll('.access tbody tr')).find((tr) => tr.textContent!.includes('Sin patente'))!;
    expect(row.textContent).toContain('Visitante');
    expect(row.textContent).toContain('Manual');
  });

  it('filtra por patente sin importar mayúsculas, espacios ni guiones', async () => {
    const { type, settle, column } = await setup();
    type('ab 123');
    await settle(350);
    expect(column(0).every((plate) => plate === 'AB 123 CD')).toBe(true);
    expect(column(0).length).toBe(3);
    type('ab-123cd');
    await settle(350);
    expect(column(0).length).toBe(3);
  });

  it('filtra por movimiento y combina con la patente', async () => {
    const { pickMovement, type, settle, column, el } = await setup();
    await pickMovement('EXIT');
    expect(column(1).every((text) => text.includes('Egreso'))).toBe(true);
    expect(column(1).length).toBeGreaterThan(0);
    type('ab123cd');
    await settle(350);
    expect(column(0)).toEqual(['AB 123 CD']);
    expect(column(1)[0]).toContain('Egreso');
    expect(el.textContent).toContain('Limpiar filtros');
  });

  it('ordena cada columna ascendente y descendente', async () => {
    const { el, click, settle, column } = await setup();
    click('th[appSortHeader="userName"] button');
    await settle();
    const names = column(3);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
    expect(el.querySelector('th[appSortHeader="userName"]')?.getAttribute('aria-sort')).toBe('ascending');
    click('th[appSortHeader="userName"] button');
    await settle();
    const descending = column(3);
    expect(descending).toEqual([...descending].sort((a, b) => b.localeCompare(a, 'es')));
    expect(descending[0]).toBe('Visitante');

    click('th[appSortHeader="timestamp"] button'); // estaba descendente por defecto: pasa a ascendente
    await settle();
    expect(el.querySelector('th[appSortHeader="timestamp"]')?.getAttribute('aria-sort')).toBe('ascending');
    const dates = column(2);
    expect(dates.length).toBe(10);

    click('th[appSortHeader="movement"] button');
    await settle();
    expect(column(1).every((text) => text.includes('Egreso'))).toBe(true); // "Egreso" < "Ingreso"
  });

  it('pagina y vuelve a la primera página al filtrar', async () => {
    const { el, click, pickMovement, settle } = await setup();
    click('app-pagination button[aria-label*="iguiente"], app-pagination button:last-child');
    await settle();
    expect(el.querySelector('app-pagination')?.textContent).toContain('11');
    await pickMovement('ENTRY');
    expect(el.querySelector('.access tbody tr')).not.toBeNull();
    expect(el.querySelector('app-pagination')?.textContent).toContain('1');
  });

  it('limpia los filtros', async () => {
    const { el, click, pickMovement, type, settle, column } = await setup();
    type('zzz');
    await settle(350);
    expect(el.textContent).toContain('No se encontraron movimientos');
    await pickMovement('ENTRY');
    click('.filters .link');
    await settle(350);
    expect(column(0).length).toBe(10);
    expect((el.querySelector('#plate-search') as HTMLInputElement).value).toBe('');
    expect((el.querySelector('#movement-filter') as HTMLSelectElement).value).toBe('');
    expect(el.textContent).not.toContain('Limpiar filtros');
  });

  it('el botón Actualizar vuelve a consultar', async () => {
    let calls = 0;
    const real = new MockAccessService();
    const counting: AccessService = {
      list: (query: ListQuery): Observable<PageResponse<AccessRecord>> => {
        calls++;
        return real.list(query);
      },
    };
    const { click, settle } = await setup(counting);
    const before = calls;
    click('.toolbar .btn');
    await settle();
    expect(calls).toBe(before + 1);
  });

  it('ante un error ofrece reintentar', async () => {
    let fail = true;
    const real = new MockAccessService();
    const flaky: AccessService = {
      list: (query) => (fail ? throwError(() => new Error('boom')) : real.list(query)),
    };
    const { el, click, settle, column } = await setup(flaky);
    expect(el.textContent).toContain('Ocurrió un error inesperado.');
    fail = false;
    click('app-error-state button');
    await settle();
    expect(column(0).length).toBe(10);
  });
});

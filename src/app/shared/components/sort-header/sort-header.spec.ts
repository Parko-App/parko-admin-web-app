import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SortState } from '../../../core/models/sort.model';
import { compareValues, nextSort, sortRows, toSortParam } from '../../utils/sort';
import { SortHeaderComponent } from './sort-header.component';

describe('utilidades de orden', () => {
  it('alterna asc/desc y vuelve a asc al cambiar de columna', () => {
    const asc = nextSort(null, 'name');
    expect(asc).toEqual({ field: 'name', direction: 'asc' });
    const desc = nextSort(asc, 'name');
    expect(desc.direction).toBe('desc');
    expect(nextSort(desc, 'name').direction).toBe('asc');
    expect(nextSort(desc, 'email')).toEqual({ field: 'email', direction: 'asc' });
  });

  it('arma el parámetro para el backend', () => {
    expect(toSortParam({ field: 'fullName', direction: 'desc' })).toBe('fullName,desc');
    expect(toSortParam(null)).toBeUndefined();
  });

  it('compara textos sin distinguir tildes ni mayúsculas y números por valor', () => {
    expect(compareValues('Álvaro', 'alberto')).toBeGreaterThan(0);
    expect(compareValues('árbol', 'Zorro')).toBeLessThan(0);
    expect(compareValues(10, 9)).toBeGreaterThan(0);
    expect(compareValues('A-10', 'A-9')).toBeGreaterThan(0); // orden natural
  });

  it('deja los valores vacíos al final en ambas direcciones', () => {
    const rows = [{ v: 'b' }, { v: null }, { v: 'a' }];
    const accessors = { v: (r: { v: string | null }) => r.v };
    expect(sortRows(rows, { field: 'v', direction: 'asc' }, accessors).map((r) => r.v)).toEqual(['a', 'b', null]);
    expect(sortRows(rows, { field: 'v', direction: 'desc' }, accessors).map((r) => r.v)).toEqual(['b', 'a', null]);
  });

  it('sin orden conserva el original y no modifica el arreglo recibido', () => {
    const rows = [{ v: 2 }, { v: 1 }];
    const result = sortRows(rows, null, { v: (r) => r.v });
    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });
});

describe('SortHeaderComponent', () => {
  @Component({
    imports: [SortHeaderComponent],
    template: `
      <table>
        <thead>
          <tr>
            <th scope="col" appSortHeader="name" [sort]="sort()" (sortChange)="sort.set($event)">Nombre</th>
            <th scope="col" appSortHeader="age" [sort]="sort()" (sortChange)="sort.set($event)">Edad</th>
          </tr>
        </thead>
      </table>
    `,
  })
  class Host {
    sort = signal<SortState | null>(null);
  }

  it('ordena con clic, informa aria-sort y alterna la dirección', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const [name, age] = Array.from(el.querySelectorAll('th'));
    expect(name.getAttribute('aria-sort')).toBe('none');

    (name.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(name.getAttribute('aria-sort')).toBe('ascending');
    expect(age.getAttribute('aria-sort')).toBe('none');

    (name.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(name.getAttribute('aria-sort')).toBe('descending');

    (age.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(name.getAttribute('aria-sort')).toBe('none');
    expect(age.getAttribute('aria-sort')).toBe('ascending');
    expect(fixture.componentInstance.sort()).toEqual({ field: 'age', direction: 'asc' });
  });
});

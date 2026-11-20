import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SortState } from '../../../core/models/sort.model';
import { nextSort } from '../../utils/sort';

/**
 * Encabezado de columna ordenable. Se usa sobre un <th>:
 *   <th scope="col" appSortHeader="fullName" [sort]="sort()" (sortChange)="onSort($event)">Nombre</th>
 * Un clic ordena ascendente, otro descendente, y así sucesivamente. Expone aria-sort.
 */
@Component({
  selector: 'th[appSortHeader]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.aria-sort]': 'ariaSort()' },
  template: `
    <button type="button" class="sort" [class.sort--active]="direction() !== null" (click)="sortChange.emit(next())">
      <span><ng-content /></span>
      <svg class="sort__icon" viewBox="0 0 10 14" aria-hidden="true" focusable="false">
        <path d="M5 1 L9 5.5 H1 Z" [class.on]="direction() === 'asc'" />
        <path d="M5 13 L1 8.5 H9 Z" [class.on]="direction() === 'desc'" />
      </svg>
    </button>
  `,
  styleUrl: './sort-header.component.scss',
})
export class SortHeaderComponent {
  /** Campo que se ordena (nombre que entiende el backend o el accessor local). */
  readonly field = input.required<string>({ alias: 'appSortHeader' });
  readonly sort = input<SortState | null>(null);
  readonly sortChange = output<SortState>();

  protected readonly direction = computed(() => (this.sort()?.field === this.field() ? this.sort()!.direction : null));
  protected readonly next = computed(() => nextSort(this.sort(), this.field()));
  protected readonly ariaSort = computed(() => {
    const direction = this.direction();
    return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
  });
}

import { DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, merge, of, switchMap, tap } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import { PageResponse } from '../../core/models/page-response.model';
import { SortState } from '../../core/models/sort.model';
import { AsyncStatus } from './async-state';

export interface ListQuery {
  search: string;
  page: number;
  size: number;
  sort: SortState | null;
}

/**
 * Estado de una tabla paginada con búsqueda y orden del lado del servidor.
 * Se crea como propiedad del componente (necesita contexto de inyección):
 *   protected readonly list = new PagedList((query) => this.service.list(query));
 * y la plantilla usa list.status(), list.items(), list.changeSort($event), etc.
 */
export class PagedList<T> {
  private readonly reload$ = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<AsyncStatus>('loading');
  readonly error = signal<string | null>(null);
  readonly data = signal<PageResponse<T> | null>(null);
  readonly page = signal(0);
  readonly sort = signal<SortState | null>(null);
  readonly search = signal('');

  readonly items = computed(() => this.data()?.content ?? []);
  readonly total = computed(() => this.data()?.totalElements ?? 0);

  constructor(
    fetch: (query: ListQuery) => Observable<PageResponse<T>>,
    private readonly pageSize = 10,
  ) {
    merge(of(undefined), this.reload$)
      .pipe(
        tap(() => this.status.set('loading')),
        switchMap(() =>
          fetch({ search: this.search(), page: this.page(), size: this.pageSize, sort: this.sort() }).pipe(
            tap((page) => {
              this.data.set(page);
              this.error.set(null);
              this.status.set(page.content.length === 0 ? 'empty' : 'success');
            }),
            catchError((error: unknown) => {
              this.error.set(toErrorMessage(error));
              this.status.set('error');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  reload(): void {
    this.reload$.next();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.reload();
  }

  changeSort(sort: SortState): void {
    this.sort.set(sort);
    this.page.set(0);
    this.reload();
  }

  setSearch(term: string): void {
    this.search.set(term);
    this.page.set(0);
    this.reload();
  }

  /** Conecta un campo de búsqueda: espera a que el usuario deje de escribir. */
  bindSearch(control: FormControl<string>, debounceMs = 300): void {
    control.valueChanges
      .pipe(debounceTime(debounceMs), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.setSearch(term));
  }

  /** Recarga después de eliminar: si era el único de la última página, retrocede una. */
  reloadAfterRemoval(): void {
    if (this.items().length === 1 && this.page() > 0) {
      this.page.update((page) => page - 1);
    }
    this.reload();
  }
}

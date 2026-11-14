import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Paginación compatible con PageResponse de Spring: `page` empieza en 0. */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 0) {
      <nav class="pagination" aria-label="Paginación">
        <span class="pagination__info">{{ from() }}–{{ to() }} de {{ totalElements() }}</span>
        <div class="pagination__actions">
          <button type="button" [disabled]="page() <= 0" (click)="pageChange.emit(page() - 1)">Anterior</button>
          <span aria-current="page">Página {{ page() + 1 }} de {{ totalPages() }}</span>
          <button type="button" [disabled]="page() >= totalPages() - 1" (click)="pageChange.emit(page() + 1)">
            Siguiente
          </button>
        </div>
      </nav>
    }
  `,
  styles: `
    .pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0 0; font-size: 13px; color: var(--color-muted); }
    .pagination__actions { display: flex; align-items: center; gap: 12px; }
    button { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-surface); color: var(--color-text); font: inherit; cursor: pointer; }
    button:hover:not(:disabled) { background: var(--color-background); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly from = computed(() => (this.totalElements() === 0 ? 0 : this.page() * this.size() + 1));
  protected readonly to = computed(() => Math.min((this.page() + 1) * this.size(), this.totalElements()));
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <h3>{{ title() }}</h3>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty { padding: 40px 16px; text-align: center; color: var(--color-muted); font-size: 14px; }
    h3 { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: var(--color-text); }
    p { margin: 0; }
  `,
})
export class EmptyStateComponent {
  readonly title = input('No hay resultados');
  readonly description = input('');
}

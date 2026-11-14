import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error" role="alert">
      <h3>No se pudo cargar la información</h3>
      <p>{{ message() }}</p>
      @if (retryable()) {
        <button type="button" class="error__retry" (click)="retry.emit()">Reintentar</button>
      }
    </div>
  `,
  styles: `
    .error { padding: 40px 16px; text-align: center; font-size: 14px; color: var(--color-muted); }
    h3 { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: var(--color-danger); }
    p { margin: 0 0 16px; }
    .error__retry {
      padding: 8px 16px;
      border: 1px solid var(--color-primary);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-primary);
      font: inherit;
      font-weight: 500;
      cursor: pointer;
    }
    .error__retry:hover { background: var(--color-background); }
  `,
})
export class ErrorStateComponent {
  readonly message = input('Ocurrió un error inesperado.');
  readonly retryable = input(true);
  readonly retry = output<void>();
}

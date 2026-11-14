import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading" role="status" aria-live="polite">
      <span class="loading__spinner" aria-hidden="true"></span>
      <span>{{ message() }}</span>
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px 16px;
      color: var(--color-muted);
      font-size: 14px;
    }
    .loading__spinner {
      width: 28px;
      height: 28px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .loading__spinner { animation-duration: 2.4s; }
    }
  `,
})
export class LoadingStateComponent {
  readonly message = input('Cargando…');
}

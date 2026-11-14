import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/notifications/toast.service';

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.type" [attr.role]="toast.type === 'error' ? 'alert' : 'status'">
          <span>{{ toast.message }}</span>
          <button type="button" aria-label="Cerrar aviso" (click)="toasts.dismiss(toast.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts { position: fixed; right: 24px; bottom: 24px; z-index: 200; display: grid; gap: 8px; width: min(380px, calc(100vw - 32px)); }
    .toast { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 8px; border-left: 4px solid; background: var(--color-surface); box-shadow: var(--shadow-modal); font-size: 14px; color: var(--color-text); }
    .toast--success { border-color: var(--color-success); }
    .toast--error { border-color: var(--color-danger); }
    .toast--info { border-color: var(--color-info); }
    button { border: 0; background: transparent; color: var(--color-muted); font-size: 18px; line-height: 1; cursor: pointer; }
  `,
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);
}

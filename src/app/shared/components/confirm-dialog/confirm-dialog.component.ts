import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

/** Confirmación de acciones sensibles (eliminar, desactivar, anular). */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  template: `
    <app-modal [open]="open()" [title]="title()" size="sm" (closed)="cancelled.emit()">
      <p class="message">{{ message() }}</p>
      <ng-container modalFooter>
        <button type="button" class="btn" (click)="cancelled.emit()">{{ cancelLabel() }}</button>
        <button type="button" class="btn btn--primary" [class.btn--danger]="danger()" (click)="confirmed.emit()">
          {{ confirmLabel() }}
        </button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .message { margin: 0; font-size: 14px; color: var(--color-text); }
    .btn { padding: 8px 16px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-surface); color: var(--color-text); font: inherit; font-weight: 500; cursor: pointer; }
    .btn:hover { background: var(--color-background); }
    .btn--primary { border-color: var(--color-primary); background: var(--color-primary); color: #fff; }
    .btn--primary:hover { background: var(--color-primary-dark); }
    .btn--danger { border-color: var(--color-danger); background: var(--color-danger); }
    .btn--danger:hover { background: #b91c1c; }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input.required<boolean>();
  readonly title = input('Confirmar acción');
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly danger = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}

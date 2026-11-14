import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

let nextId = 0;

/**
 * Ventana modal accesible: role="dialog", cierra con Escape o al hacer clic en el fondo,
 * enfoca el diálogo al abrir y devuelve el foco al elemento que lo abrió.
 * Uso: <app-modal [open]="abierto()" title="Editar usuario" (closed)="abierto.set(false)">
 *        ...contenido...
 *        <div modalFooter>...botones...</div>
 *      </app-modal>
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const dialog = this.dialog();
      if (this.open() && dialog) {
        this.previouslyFocused = document.activeElement as HTMLElement | null;
        dialog.nativeElement.focus();
      } else if (!this.open() && this.previouslyFocused) {
        this.previouslyFocused.focus();
        this.previouslyFocused = null;
      }
    });
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closed.emit();
    }
  }
}

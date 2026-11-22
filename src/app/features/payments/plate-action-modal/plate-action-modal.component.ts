import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { normalizePlate, plateValidator } from '../../../shared/utils/plate';

export type PlateActionMode = 'ENTRY' | 'EXIT';

const TEXTS: Record<PlateActionMode, { title: string; intro: string; submit: string; busy: string }> = {
  ENTRY: {
    title: 'Generar ingreso',
    intro:
      'Escribí la patente. Si es de un vehículo registrado, el ingreso es de usuario registrado; si no, de visitante, ' +
      'y se genera su ticket.',
    submit: 'Generar ingreso',
    busy: 'Generando…',
  },
  EXIT: {
    title: 'Generar egreso',
    intro: 'Escribí la patente. Solo se genera el egreso si el ticket de esa patente ya está pagado.',
    submit: 'Generar egreso',
    busy: 'Generando…',
  },
};

/** Ingreso o egreso manual: el administrador escribe la patente de quien no pasa por la cámara. */
@Component({
  selector: 'app-plate-action-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './plate-action-modal.component.html',
  styleUrl: './plate-action-modal.component.scss',
})
export class PlateActionModalComponent {
  /** null = cerrado. */
  readonly mode = input.required<PlateActionMode | null>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  /** Patente normalizada (mayúsculas, sin espacios ni guiones). */
  readonly submitted = output<string>();
  readonly closed = output<void>();

  protected readonly attempted = signal(false);
  protected readonly texts = computed(() => TEXTS[this.mode() ?? 'ENTRY']);

  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group({
    plate: ['', [Validators.required, plateValidator]],
  });

  constructor() {
    // Cada vez que se abre, el formulario parte limpio.
    effect(() => {
      if (this.mode() !== null) {
        this.attempted.set(false);
        this.form.reset({ plate: '' });
      }
    });
  }

  protected showError(): boolean {
    return this.attempted() && this.form.controls.plate.invalid;
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.form.invalid || this.saving()) {
      return;
    }
    this.submitted.emit(normalizePlate(this.form.getRawValue().plate));
  }
}

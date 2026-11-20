import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { RegisterPaymentRequest } from '../../../core/models/payment.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { CurrencyArPipe } from '../../../shared/pipes/currency-ar.pipe';

const NOTES_MAX_LENGTH = 200;

/** El efectivo recibido, si se carga, debe cubrir el monto a pagar. */
function receivedCoversAmount(group: AbstractControl): ValidationErrors | null {
  const amount = group.get('amount')?.value as number | null;
  const received = group.get('receivedAmount')?.value as number | null;
  if (amount === null || received === null || received === undefined || amount === undefined) {
    return null;
  }
  return received < amount ? { receivedTooLow: true } : null;
}

/** Registro manual de un pago en efectivo: ticket, monto, efectivo recibido (con vuelto) y observaciones. */
@Component({
  selector: 'app-payment-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, CurrencyArPipe],
  templateUrl: './payment-form-modal.component.html',
  styleUrl: './payment-form-modal.component.scss',
})
export class PaymentFormModalComponent {
  readonly open = input.required<boolean>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<RegisterPaymentRequest>();
  readonly closed = output<void>();

  protected readonly notesMaxLength = NOTES_MAX_LENGTH;
  protected readonly attempted = signal(false);

  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.group(
    {
      ticketNumber: this.fb.nonNullable.control('', Validators.required),
      amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
      receivedAmount: this.fb.control<number | null>(null, Validators.min(0.01)),
      notes: this.fb.nonNullable.control('', Validators.maxLength(NOTES_MAX_LENGTH)),
    },
    { validators: receivedCoversAmount },
  );

  private readonly values = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  /** Vuelto a entregar: solo se muestra si se cargó el efectivo recibido y alcanza. */
  protected readonly change = computed(() => {
    const { amount, receivedAmount } = this.values();
    return amount !== null && receivedAmount !== null && receivedAmount >= amount ? receivedAmount - amount : null;
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.attempted.set(false);
        this.form.reset({ ticketNumber: '', amount: null, receivedAmount: null, notes: '' });
      }
    });
  }

  protected showError(name: 'ticketNumber' | 'amount' | 'receivedAmount' | 'notes'): boolean {
    return this.attempted() && this.form.controls[name].invalid;
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const notes = value.notes.trim();
    this.submitted.emit({
      ticketNumber: value.ticketNumber.trim().toUpperCase(),
      method: 'CASH',
      amount: value.amount!,
      ...(value.receivedAmount !== null ? { receivedAmount: value.receivedAmount } : {}),
      ...(notes ? { notes } : {}),
    });
  }
}

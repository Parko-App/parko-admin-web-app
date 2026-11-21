import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RegisterPaymentRequest } from '../../../core/models/payment.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';


/** Registro manual de un pago en efectivo: ticket y monto. */
@Component({
  selector: 'app-payment-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './payment-form-modal.component.html',
  styleUrl: './payment-form-modal.component.scss',
})
export class PaymentFormModalComponent {
  readonly open = input.required<boolean>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<RegisterPaymentRequest>();
  readonly closed = output<void>();
  protected readonly attempted = signal(false);

  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.group({
    ticketNumber: this.fb.nonNullable.control('', Validators.required),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.attempted.set(false);
        this.form.reset({ ticketNumber: '', amount: null });
      }
    });
  }

  protected showError(name: 'ticketNumber' | 'amount'): boolean {
    return this.attempted() && this.form.controls[name].invalid;
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({
      ticketNumber: value.ticketNumber.trim().toUpperCase(),
      method: 'CASH',
      amount: value.amount!,
    });
  }
}

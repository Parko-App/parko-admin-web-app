import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminUser,
  USER_STATUS_LABELS,
  USER_TYPE_LABELS,
  UserStatus,
  UserType,
  UserUpsertRequest,
} from '../../../core/models/user.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

/** Alta (user = null) y edición de un usuario. */
@Component({
  selector: 'app-user-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './user-form-modal.component.html',
  styleUrl: './user-form-modal.component.scss',
})
export class UserFormModalComponent {
  readonly open = input.required<boolean>();
  readonly user = input<AdminUser | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly saved = output<UserUpsertRequest>();
  readonly closed = output<void>();

  protected readonly types = Object.entries(USER_TYPE_LABELS) as [UserType, string][];
  protected readonly statuses = Object.entries(USER_STATUS_LABELS) as [UserStatus, string][];
  protected readonly submitted = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    type: ['STUDENT' as UserType, Validators.required],
    status: ['ACTIVE' as UserStatus, Validators.required],
    balance: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    // Cada vez que se abre el diálogo, el formulario parte limpio (alta) o con los datos del usuario (edición).
    effect(() => {
      if (!this.open()) {
        return;
      }
      const user = this.user();
      this.submitted.set(false);
      this.form.reset({
        fullName: user?.fullName ?? '',
        email: user?.email ?? '',
        type: user?.type ?? 'STUDENT',
        status: user?.status ?? 'ACTIVE',
        balance: user?.balance ?? 0,
      });
    });
  }

  protected get isEdit(): boolean {
    return this.user() !== null;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    this.saved.emit({
      fullName: value.fullName.trim(),
      email: value.email.trim().toLowerCase(),
      type: value.type,
      status: value.status,
      balance: Number(value.balance),
    });
  }
}

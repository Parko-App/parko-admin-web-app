import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import {
  AdminUser,
  USER_STATUS_LABELS,
  USER_TYPE_LABELS,
  UserStatus,
  UserType,
  UserUpsertRequest,
} from '../../../core/models/user.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

/** Misma política que identity-service: 10+ caracteres con mayúscula, minúscula, número y carácter especial. */
export function passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) {
    return null; // lo cubre Validators.required
  }
  const valid = value.length >= 10 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
  return valid ? null : { passwordPolicy: true };
}

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

  /** Un administrador no se crea ni se cambia de rol desde acá (lo impide el backend). */
  protected readonly types = (Object.entries(USER_TYPE_LABELS) as [UserType, string][]).filter(([type]) => type !== 'ADMIN');
  protected readonly adminType = [['ADMIN', USER_TYPE_LABELS.ADMIN]] as [UserType, string][];
  protected readonly statuses = Object.entries(USER_STATUS_LABELS) as [UserStatus, string][];
  protected readonly submitted = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    type: ['STUDENT' as UserType, Validators.required],
    status: ['ACTIVE' as UserStatus, Validators.required],
    password: ['', [Validators.required, passwordPolicyValidator]],
  });

  constructor() {
    // Cada vez que se abre el diálogo, el formulario parte limpio (alta) o con los datos del usuario (edición).
    effect(() => {
      if (!this.open()) {
        return;
      }
      const user = this.user();
      this.submitted.set(false);
      // La contraseña solo se define al crear el usuario.
      if (user) {
        this.form.controls.password.disable();
      } else {
        this.form.controls.password.enable();
      }
      if (user?.type === 'ADMIN') {
        this.form.controls.type.disable();
      } else {
        this.form.controls.type.enable();
      }
      this.form.reset({
        fullName: user?.fullName ?? '',
        email: user?.email ?? '',
        type: user?.type ?? 'STUDENT',
        status: user?.status ?? 'ACTIVE',
        password: '',
      });
    });
  }

  protected get isEdit(): boolean {
    return this.user() !== null;
  }

  protected get isAdmin(): boolean {
    return this.user()?.type === 'ADMIN';
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
      ...(this.isEdit ? {} : { password: value.password }),
    });
  }
}

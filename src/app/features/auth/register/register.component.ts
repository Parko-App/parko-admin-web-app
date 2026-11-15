import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, startWith } from 'rxjs';
import { registerErrorMessage } from '../../../core/auth/auth-error-message';
import { MOCK_INVITATION_CODE, RegistrationApi } from '../../../core/auth/registration.api';
import { USE_MOCKS } from '../../../core/config/tokens';
import { PASSWORD_RULES, passwordRulesValidator, passwordsMatchValidator } from '../../../shared/utils/password-rules';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly registration = inject(RegistrationApi);
  private readonly router = inject(Router);

  protected readonly demoMode = inject(USE_MOCKS);
  protected readonly demoCode = MOCK_INVITATION_CODE;

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordRulesValidator]],
      confirmPassword: ['', [Validators.required]],
      invitationCode: ['', [Validators.required]],
    },
    { validators: [passwordsMatchValidator] },
  );

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges.pipe(startWith('')), {
    initialValue: '',
  });
  protected readonly rules = computed(() =>
    PASSWORD_RULES.map((rule) => ({ label: rule.label, ok: rule.test(this.passwordValue()) })),
  );

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { fullName, email, password, invitationCode } = this.form.getRawValue();
      await firstValueFrom(
        this.registration.register({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          invitationCode: invitationCode.trim(),
        }),
      );
      await this.router.navigate(['/login'], { queryParams: { registered: '1' } });
    } catch (error) {
      this.error.set(registerErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}

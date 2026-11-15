import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { authErrorMessage } from '../../../core/auth/auth-error-message';
import { AuthService } from '../../../core/auth/auth.service';
import { USE_MOCKS } from '../../../core/config/tokens';

const DEFAULT_URL = '/admin/dashboard';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly demoMode = inject(USE_MOCKS);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly error = signal<string | null>(
    this.route.snapshot.queryParamMap.get('reason') === 'expired'
      ? 'Tu sesión expiró. Iniciá sesión nuevamente.'
      : null,
  );

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigateByUrl(this.returnUrl());
    } catch (error) {
      this.error.set(authErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  /** Solo se acepta una ruta interna: evita redirecciones a sitios externos. */
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url : DEFAULT_URL;
  }
}

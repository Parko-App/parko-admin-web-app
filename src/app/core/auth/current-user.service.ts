import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export interface AdminProfile {
  nombre: string;
  rol: string;
}

/** Administrador con sesión iniciada, en el formato que usa el layout. */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly profile = computed<AdminProfile>(() => {
    const user = this.auth.user();
    return { nombre: user?.nombre ?? 'Administrador', rol: 'Administrador' };
  });

  readonly initials = computed(() =>
    this.profile()
      .nombre.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}

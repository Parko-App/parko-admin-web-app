import { Injectable, computed, inject, signal } from '@angular/core';
import { USE_MOCKS } from '../config/tokens';

export interface AdminProfile {
  nombre: string;
  rol: string;
}

/**
 * Administrador con sesión iniciada.
 * PROVISORIO: en la US4 se reemplaza por los datos reales de /auth/me.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly useMocks = inject(USE_MOCKS);

  readonly profile = signal<AdminProfile>(
    this.useMocks
      ? { nombre: 'María Acosta', rol: 'Administrador' }
      : { nombre: 'Administrador', rol: 'Administrador' },
  );

  readonly initials = computed(() =>
    this.profile()
      .nombre.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );

  /** Se conecta con el cierre de sesión real en la US4. */
  logout(): void {}
}

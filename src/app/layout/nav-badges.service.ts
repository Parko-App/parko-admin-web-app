import { Injectable, inject, signal } from '@angular/core';
import { USE_MOCKS } from '../core/config/tokens';

/**
 * Contadores que muestra el topbar.
 * PROVISORIO: el contador de notificaciones es de ejemplo hasta definir su origen con el backend.
 */
@Injectable({ providedIn: 'root' })
export class NavBadgesService {
  private readonly useMocks = inject(USE_MOCKS);

  readonly notifications = signal(this.useMocks ? 2 : 0);
}

import { Injectable, inject, signal } from '@angular/core';
import { USE_MOCKS } from '../core/config/tokens';

/**
 * Contadores que muestran el sidebar y el topbar.
 * PROVISORIO: en la US de Incidencias y Dashboard se alimentan desde la API.
 */
@Injectable({ providedIn: 'root' })
export class NavBadgesService {
  private readonly useMocks = inject(USE_MOCKS);

  readonly openIncidents = signal(this.useMocks ? 3 : 0);
  readonly notifications = signal(this.useMocks ? 2 : 0);
}

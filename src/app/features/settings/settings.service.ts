import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { SystemSettings } from '../../core/models/settings.model';
import { ApiClient } from '../../core/services/api-client.service';

export abstract class SettingsService {
  abstract get(): Observable<SystemSettings>;
  abstract save(settings: SystemSettings): Observable<SystemSettings>;
}

@Injectable()
export class HttpSettingsService extends SettingsService {
  private readonly api = inject(ApiClient);

  get(): Observable<SystemSettings> {
    return this.api.get<SystemSettings>('admin/settings');
  }

  save(settings: SystemSettings): Observable<SystemSettings> {
    return this.api.put<SystemSettings>('admin/settings', settings);
  }
}

const DEFAULTS: SystemSettings = {
  registeredDailyRate: 4500,
  visitorDailyRate: 6200,
  motorcycleDailyRate: 2250,
  motorcycleDiscountPercent: 50,
  plateLimits: { students: 2, teachers: 2, staff: 3 },
  totalCapacity: 247,
  schedule: {
    weekdays: { open: '06:00', close: '22:00' },
    saturday: { open: '07:00', close: '14:00' },
  },
};

/** Configuración de demostración en memoria (solo con useMocks: true). */
@Injectable()
export class MockSettingsService extends SettingsService {
  private current: SystemSettings = structuredClone(DEFAULTS);

  get(): Observable<SystemSettings> {
    return of(structuredClone(this.current));
  }

  save(settings: SystemSettings): Observable<SystemSettings> {
    this.current = structuredClone(settings);
    return of(structuredClone(this.current));
  }
}

export const SETTINGS_SERVICE_PROVIDER = {
  provide: SettingsService,
  useFactory: () => (inject(USE_MOCKS) ? new MockSettingsService() : new HttpSettingsService()),
};

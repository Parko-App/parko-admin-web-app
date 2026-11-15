import { EnvironmentProviders, Provider, inject, provideAppInitializer } from '@angular/core';
import { ApiClient } from '../services/api-client.service';
import { FIREBASE_CONFIG, USE_MOCKS } from '../config/tokens';
import { AdminProfileApi, HttpAdminProfileApi, MockAdminProfileApi } from './admin-profile.api';
import { HttpRegistrationApi, MockRegistrationApi, RegistrationApi } from './registration.api';
import { AuthGateway } from './auth.gateway';
import { AuthService } from './auth.service';
import { FirebaseAuthGateway } from './firebase-auth.gateway';
import { MockAuthGateway } from './mock-auth.gateway';

/** Autenticación real (Firebase + identity-service) o simulada, según USE_MOCKS. */
export function provideAuth(): (Provider | EnvironmentProviders)[] {
  return [
    {
      provide: AuthGateway,
      useFactory: () => (inject(USE_MOCKS) ? new MockAuthGateway() : new FirebaseAuthGateway(inject(FIREBASE_CONFIG))),
    },
    {
      provide: AdminProfileApi,
      useFactory: () => (inject(USE_MOCKS) ? new MockAdminProfileApi() : new HttpAdminProfileApi(inject(ApiClient))),
    },
    {
      provide: RegistrationApi,
      useFactory: () => (inject(USE_MOCKS) ? new MockRegistrationApi() : new HttpRegistrationApi(inject(ApiClient))),
    },
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ];
}

/** Proveedores para tests: autenticación simulada y sin inicializador. */
export const MOCK_AUTH_PROVIDERS: Provider[] = [
  { provide: AuthGateway, useFactory: () => new MockAuthGateway() },
  { provide: AdminProfileApi, useFactory: () => new MockAdminProfileApi() },
  { provide: RegistrationApi, useFactory: () => new MockRegistrationApi() },
];

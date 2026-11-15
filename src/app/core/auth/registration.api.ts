import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiClient } from '../services/api-client.service';
import { MOCK_PROFILES } from './admin-profile.api';
import { RegisterAdminRequest, UserResponse } from './auth.models';
import { MOCK_ACCOUNTS } from './mock-auth.gateway';

/** Alta de administradores. Endpoint SUPUESTO hasta que el backend lo defina. */
export abstract class RegistrationApi {
  abstract register(request: RegisterAdminRequest): Observable<UserResponse>;
}

@Injectable()
export class HttpRegistrationApi extends RegistrationApi {
  constructor(private readonly api: ApiClient) {
    super();
  }

  register(request: RegisterAdminRequest): Observable<UserResponse> {
    return this.api.post<UserResponse>('admin/register', request);
  }
}

/** Código válido en modo demo. */
export const MOCK_INVITATION_CODE = 'PARKO-2026';

export class MockRegistrationApi extends RegistrationApi {
  register(request: RegisterAdminRequest): Observable<UserResponse> {
    const email = request.email.trim().toLowerCase();
    if (request.invitationCode.trim() !== MOCK_INVITATION_CODE) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { message: 'El código de invitación no es válido o ya fue utilizado.' },
          }),
      );
    }
    if (MOCK_ACCOUNTS[email]) {
      return throwError(() => new HttpErrorResponse({ status: 409 }));
    }
    const uid = `mock-${Object.keys(MOCK_ACCOUNTS).length + 1}`;
    const profile: UserResponse = {
      id: crypto.randomUUID(),
      studentId: null,
      fullName: request.fullName.trim(),
      email,
      role: 'ADMIN',
      active: true,
    };
    MOCK_ACCOUNTS[email] = { uid, password: request.password };
    MOCK_PROFILES[uid] = profile;
    return of(profile);
  }
}

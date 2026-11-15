import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiClient } from '../services/api-client.service';
import { UserResponse } from './auth.models';

/** Perfil del usuario autenticado (identity-service). */
export abstract class AdminProfileApi {
  abstract getByUid(uid: string): Observable<UserResponse>;
}

@Injectable()
export class HttpAdminProfileApi extends AdminProfileApi {
  constructor(private readonly api: ApiClient) {
    super();
  }

  getByUid(uid: string): Observable<UserResponse> {
    return this.api.get<UserResponse>(`user/${encodeURIComponent(uid)}`);
  }
}

const MOCK_PROFILES: Record<string, UserResponse> = {
  'mock-admin': {
    id: '00000000-0000-0000-0000-000000000001',
    studentId: null,
    fullName: 'María Acosta',
    email: 'admin@parko.site',
    role: 'ADMIN',
    active: true,
  },
  'mock-student': {
    id: '00000000-0000-0000-0000-000000000002',
    studentId: '82116',
    fullName: 'Alumno de Prueba',
    email: 'alumno@parko.site',
    role: 'STUDENT',
    active: true,
  },
};

export class MockAdminProfileApi extends AdminProfileApi {
  getByUid(uid: string): Observable<UserResponse> {
    const profile = MOCK_PROFILES[uid];
    return profile ? of(profile) : throwError(() => new HttpErrorResponse({ status: 404 }));
  }
}

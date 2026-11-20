import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { PageResponse } from '../../core/models/page-response.model';
import {
  AdminUser,
  USER_TYPE_LABELS,
  UserListQuery,
  UserUpsertRequest,
} from '../../core/models/user.model';
import { ApiClient } from '../../core/services/api-client.service';
import { USER_STATUS_LABELS } from '../../core/models/user.model';
import { sortRows, toSortParam } from '../../shared/utils/sort';

export abstract class UsersService {
  abstract list(query: UserListQuery): Observable<PageResponse<AdminUser>>;
  abstract create(request: UserUpsertRequest): Observable<AdminUser>;
  abstract update(id: string, request: UserUpsertRequest): Observable<AdminUser>;
  abstract delete(id: string): Observable<void>;
}

@Injectable()
export class HttpUsersService extends UsersService {
  private readonly api = inject(ApiClient);

  list(query: UserListQuery): Observable<PageResponse<AdminUser>> {
    return this.api.get<PageResponse<AdminUser>>('admin/users', {
      search: query.search.trim(),
      page: query.page,
      size: query.size,
      sort: toSortParam(query.sort),
    });
  }

  create(request: UserUpsertRequest): Observable<AdminUser> {
    return this.api.post<AdminUser>('admin/users', request);
  }

  update(id: string, request: UserUpsertRequest): Observable<AdminUser> {
    return this.api.put<AdminUser>(`admin/users/${encodeURIComponent(id)}`, request);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`admin/users/${encodeURIComponent(id)}`);
  }
}

const SEED: AdminUser[] = [
  { id: 'u-1', fullName: 'Lucas Fernández', email: 'lucas.fernandez@utn.edu.ar', type: 'STUDENT', balance: 4200, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-2', fullName: 'Valentina Romero', email: 'valentina.romero@utn.edu.ar', type: 'STUDENT', balance: 1850, vehicleCount: 2, status: 'ACTIVE' },
  { id: 'u-3', fullName: 'Sofía Herrera', email: 's.herrera@utn.edu.ar', type: 'TEACHER', balance: 12400, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-4', fullName: 'Martín Gutiérrez', email: 'm.gutierrez@utn.edu.ar', type: 'STUDENT', balance: 300, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-5', fullName: 'Diego Morales', email: 'd.morales@utn.edu.ar', type: 'STUDENT', balance: 0, vehicleCount: 1, status: 'SUSPENDED' },
  { id: 'u-6', fullName: 'Ana López', email: 'a.lopez@utn.edu.ar', type: 'STAFF', balance: 8900, vehicleCount: 2, status: 'ACTIVE' },
  { id: 'u-7', fullName: 'Carlos Pérez', email: 'c.perez@utn.edu.ar', type: 'TEACHER', balance: 7600, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-8', fullName: 'Laura Méndez', email: 'l.mendez@utn.edu.ar', type: 'STUDENT', balance: 2100, vehicleCount: 0, status: 'INACTIVE' },
  { id: 'u-9', fullName: 'Roberto Sánchez', email: 'r.sanchez@utn.edu.ar', type: 'STAFF', balance: 15300, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-10', fullName: 'Florencia Torres', email: 'f.torres@utn.edu.ar', type: 'STUDENT', balance: 950, vehicleCount: 1, status: 'ACTIVE' },
];

/** Valores por los que se ordena cada columna en el mock (tipo y estado, por su texto visible). */
const USER_SORT_ACCESSORS: Record<string, (user: AdminUser) => unknown> = {
  fullName: (user) => user.fullName,
  email: (user) => user.email,
  type: (user) => USER_TYPE_LABELS[user.type],
  balance: (user) => user.balance,
  vehicleCount: (user) => user.vehicleCount,
  status: (user) => USER_STATUS_LABELS[user.status],
};

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Datos de demostración en memoria (solo con useMocks: true). */
@Injectable()
export class MockUsersService extends UsersService {
  private users: AdminUser[] = SEED.map((user) => ({ ...user }));

  list(query: UserListQuery): Observable<PageResponse<AdminUser>> {
    const term = normalize(query.search.trim());
    const filtered = this.users.filter(
      (user) =>
        !term ||
        [user.fullName, user.email, USER_TYPE_LABELS[user.type]].some((value) => normalize(value).includes(term)),
    );
    const sorted = sortRows(filtered, query.sort, USER_SORT_ACCESSORS);
    const start = query.page * query.size;
    return of({
      content: sorted.slice(start, start + query.size),
      page: query.page,
      size: query.size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / query.size),
    });
  }

  create(request: UserUpsertRequest): Observable<AdminUser> {
    if (this.emailTaken(request.email)) {
      return throwError(() => new HttpErrorResponse({ status: 409 }));
    }
    const user: AdminUser = { id: `u-${crypto.randomUUID()}`, vehicleCount: 0, ...request };
    this.users = [...this.users, user];
    return of(user);
  }

  update(id: string, request: UserUpsertRequest): Observable<AdminUser> {
    const current = this.users.find((user) => user.id === id);
    if (!current) {
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }
    if (this.emailTaken(request.email, id)) {
      return throwError(() => new HttpErrorResponse({ status: 409 }));
    }
    const updated: AdminUser = { ...current, ...request };
    this.users = this.users.map((user) => (user.id === id ? updated : user));
    return of(updated);
  }

  delete(id: string): Observable<void> {
    if (!this.users.some((user) => user.id === id)) {
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }
    this.users = this.users.filter((user) => user.id !== id);
    return of(undefined);
  }

  private emailTaken(email: string, exceptId?: string): boolean {
    const wanted = email.trim().toLowerCase();
    return this.users.some((user) => user.id !== exceptId && user.email.toLowerCase() === wanted);
  }
}

export const USERS_SERVICE_PROVIDER = {
  provide: UsersService,
  useFactory: () => (inject(USE_MOCKS) ? new MockUsersService() : new HttpUsersService()),
};

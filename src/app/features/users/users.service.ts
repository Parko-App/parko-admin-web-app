import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { PageResponse } from '../../core/models/page-response.model';
import {
  AdminUser,
  USER_STATUS_LABELS,
  USER_TYPE_LABELS,
  UserListQuery,
  UserType,
  UserUpsertRequest,
} from '../../core/models/user.model';
import { ApiClient } from '../../core/services/api-client.service';
import { sortRows } from '../../shared/utils/sort';

export abstract class UsersService {
  abstract list(query: UserListQuery): Observable<PageResponse<AdminUser>>;
  abstract create(request: UserUpsertRequest): Observable<AdminUser>;
  abstract update(id: string, request: UserUpsertRequest): Observable<AdminUser>;
  /** Baja lógica: la cuenta queda inactiva. */
  abstract delete(id: string): Observable<void>;
}

/** Valores por los que se ordena cada columna (tipo y estado, por su texto visible). */
const USER_SORT_ACCESSORS: Record<string, (user: AdminUser) => unknown> = {
  fullName: (user) => user.fullName,
  email: (user) => user.email,
  type: (user) => USER_TYPE_LABELS[user.type],
  balance: (user) => user.balance,
  vehicleCount: (user) => user.vehicleCount,
  status: (user) => USER_STATUS_LABELS[user.status],
};

// ---- API real (admin-service)

interface UserSummaryDto {
  id: string;
  studentId: string | null;
  fullName: string;
  email: string;
  role: UserType;
  active: boolean;
}

interface UserDetailDto extends UserSummaryDto {
  balance: number;
  vehicles: unknown[];
}

const toUser = (summary: UserSummaryDto, detail: UserDetailDto | null): AdminUser => ({
  id: summary.id,
  studentId: summary.studentId,
  fullName: summary.fullName,
  email: summary.email,
  type: summary.role,
  balance: detail ? Number(detail.balance) : null,
  vehicleCount: detail ? detail.vehicles.length : null,
  status: summary.active ? 'ACTIVE' : 'INACTIVE',
});

@Injectable()
export class HttpUsersService extends UsersService {
  private readonly api = inject(ApiClient);

  /**
   * El listado del backend no trae saldo ni cantidad de patentes: se completan con el detalle de cada
   * usuario de la página. El backend pagina de a 20 y ordena por alta (más nuevos primero), así que
   * el orden de las columnas se aplica solo dentro de la página mostrada.
   */
  list(query: UserListQuery): Observable<PageResponse<AdminUser>> {
    return this.api
      .get<PageResponse<UserSummaryDto>>('admin/users', { q: query.search.trim(), page: query.page })
      .pipe(
        switchMap((page) => {
          if (page.content.length === 0) {
            return of({ ...page, content: [] as AdminUser[] });
          }
          return forkJoin(
            page.content.map((summary) =>
              this.api.get<UserDetailDto>(`admin/users/${summary.id}`).pipe(
                map((detail) => toUser(summary, detail)),
                catchError(() => of(toUser(summary, null))),
              ),
            ),
          ).pipe(map((content) => ({ ...page, content: sortRows(content, query.sort, USER_SORT_ACCESSORS) })));
        }),
      );
  }

  create(request: UserUpsertRequest): Observable<AdminUser> {
    return this.api
      .post<UserDetailDto>('admin/users', {
        fullName: request.fullName,
        email: request.email,
        password: request.password,
        role: request.type,
      })
      .pipe(map((detail) => toUser(detail, detail)));
  }

  update(id: string, request: UserUpsertRequest): Observable<AdminUser> {
    return this.api
      .patch<UserDetailDto>(`admin/users/${encodeURIComponent(id)}`, {
        fullName: request.fullName,
        email: request.email,
        role: request.type,
        active: request.status === 'ACTIVE',
      })
      .pipe(map((detail) => toUser(detail, detail)));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`admin/users/${encodeURIComponent(id)}`);
  }
}

// ---- Datos de demostración (solo con useMocks: true)

const SEED: AdminUser[] = [
  { id: 'u-1', studentId: '82116', fullName: 'Lucas Fernández', email: 'lucas.fernandez@utn.edu.ar', type: 'STUDENT', balance: 4200, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-2', studentId: '81234', fullName: 'Valentina Romero', email: 'valentina.romero@utn.edu.ar', type: 'STUDENT', balance: 1850, vehicleCount: 2, status: 'ACTIVE' },
  { id: 'u-3', studentId: null, fullName: 'Sofía Herrera', email: 's.herrera@utn.edu.ar', type: 'STAFF', balance: 12400, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-4', studentId: '80987', fullName: 'Martín Gutiérrez', email: 'm.gutierrez@utn.edu.ar', type: 'STUDENT', balance: 300, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-5', studentId: '81555', fullName: 'Diego Morales', email: 'd.morales@utn.edu.ar', type: 'STUDENT', balance: 0, vehicleCount: 1, status: 'INACTIVE' },
  { id: 'u-6', studentId: null, fullName: 'Ana López', email: 'a.lopez@utn.edu.ar', type: 'STAFF', balance: 8900, vehicleCount: 2, status: 'ACTIVE' },
  { id: 'u-7', studentId: null, fullName: 'Carlos Pérez', email: 'c.perez@utn.edu.ar', type: 'STAFF', balance: 7600, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-8', studentId: '79321', fullName: 'Laura Méndez', email: 'l.mendez@utn.edu.ar', type: 'STUDENT', balance: 2100, vehicleCount: 0, status: 'INACTIVE' },
  { id: 'u-9', studentId: null, fullName: 'Roberto Sánchez', email: 'r.sanchez@utn.edu.ar', type: 'STAFF', balance: 15300, vehicleCount: 1, status: 'ACTIVE' },
  { id: 'u-10', studentId: '82001', fullName: 'Florencia Torres', email: 'f.torres@utn.edu.ar', type: 'STUDENT', balance: 950, vehicleCount: 1, status: 'ACTIVE' },
];

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

@Injectable()
export class MockUsersService extends UsersService {
  private users: AdminUser[] = SEED.map((user) => ({ ...user }));

  list(query: UserListQuery): Observable<PageResponse<AdminUser>> {
    const term = normalize(query.search.trim());
    const filtered = this.users.filter(
      (user) =>
        !term ||
        [user.fullName, user.email, user.studentId ?? ''].some((value) => normalize(value).includes(term)),
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
      return throwError(
        () => new HttpErrorResponse({ status: 409, error: { message: 'Ya existe un usuario con ese correo.' } }),
      );
    }
    const user: AdminUser = {
      id: `u-${crypto.randomUUID()}`,
      studentId: null,
      fullName: request.fullName,
      email: request.email,
      type: request.type,
      status: 'ACTIVE',
      balance: 0,
      vehicleCount: 0,
    };
    this.users = [...this.users, user];
    return of(user);
  }

  update(id: string, request: UserUpsertRequest): Observable<AdminUser> {
    const current = this.users.find((user) => user.id === id);
    if (!current) {
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }
    if (this.emailTaken(request.email, id)) {
      return throwError(
        () => new HttpErrorResponse({ status: 409, error: { message: 'Ya existe un usuario con ese correo.' } }),
      );
    }
    const updated: AdminUser = {
      ...current,
      fullName: request.fullName,
      email: request.email,
      type: request.type,
      status: request.status,
    };
    this.users = this.users.map((user) => (user.id === id ? updated : user));
    return of(updated);
  }

  delete(id: string): Observable<void> {
    const current = this.users.find((user) => user.id === id);
    if (!current) {
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }
    this.users = this.users.map((user) => (user.id === id ? { ...user, status: 'INACTIVE' } : user));
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

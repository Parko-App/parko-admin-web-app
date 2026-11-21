import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, throwError } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { PageResponse } from '../../core/models/page-response.model';
import { AdminVehicle, VEHICLE_STATUS_LABELS, VehicleUpsertRequest } from '../../core/models/vehicle.model';
import { ApiClient } from '../../core/services/api-client.service';
import { ListQuery } from '../../shared/utils/paged-list';
import { normalizePlate } from '../../shared/utils/plate';
import { fromServerDateTime } from '../../shared/utils/server-dates';
import { sortRows } from '../../shared/utils/sort';

export abstract class VehiclesService {
  abstract list(query: ListQuery): Observable<PageResponse<AdminVehicle>>;
  abstract create(request: VehicleUpsertRequest): Observable<AdminVehicle>;
  abstract update(id: string, request: VehicleUpsertRequest): Observable<AdminVehicle>;
  /** Baja lógica: la patente queda inactiva y se libera para otro vehículo. */
  abstract delete(id: string): Observable<void>;
}

const SORT_ACCESSORS: Record<string, (vehicle: AdminVehicle) => unknown> = {
  plate: (v) => v.plate,
  ownerName: (v) => v.ownerName,
  vehicle: (v) => `${v.brand} ${v.model}`,
  status: (v) => VEHICLE_STATUS_LABELS[v.status],
  registeredAt: (v) => Date.parse(v.registeredAt),
};

// ---- API real (admin-service)

interface VehicleDto {
  id: string;
  userId: string;
  ownerName: string;
  ownerEmail: string;
  plate: string;
  brand: string;
  model: string;
  active: boolean;
  createdAt: string;
}

interface UserLookupDto {
  id: string;
  email: string;
}

const toVehicle = (dto: VehicleDto): AdminVehicle => ({
  id: dto.id,
  userId: dto.userId,
  // Las bajas conservan la patente con un sufijo "#id" para liberarla: no se muestra.
  plate: dto.plate.split('#')[0],
  ownerName: dto.ownerName,
  ownerEmail: dto.ownerEmail,
  brand: dto.brand,
  model: dto.model,
  status: dto.active ? 'ACTIVE' : 'INACTIVE',
  registeredAt: fromServerDateTime(dto.createdAt),
});

@Injectable()
export class HttpVehiclesService extends VehiclesService {
  private readonly api = inject(ApiClient);

  /**
   * El backend filtra solo por patente, pagina de a 20 y ordena por alta (más nuevas primero):
   * el orden de las columnas se aplica dentro de la página mostrada.
   */
  list(query: ListQuery): Observable<PageResponse<AdminVehicle>> {
    return this.api
      .get<PageResponse<VehicleDto>>('admin/vehicles', { plate: normalizePlate(query.search), page: query.page })
      .pipe(
        map((page) => ({
          ...page,
          content: sortRows(page.content.map(toVehicle), query.sort, SORT_ACCESSORS),
        })),
      );
  }

  create(request: VehicleUpsertRequest): Observable<AdminVehicle> {
    return this.findUserId(request.ownerEmail).pipe(
      switchMap((userId) =>
        this.api.post<VehicleDto>('admin/vehicles', {
          userId,
          plate: request.plate,
          brand: request.brand,
          model: request.model,
        }),
      ),
      map(toVehicle),
    );
  }

  update(id: string, request: VehicleUpsertRequest): Observable<AdminVehicle> {
    return this.findUserId(request.ownerEmail).pipe(
      switchMap((userId) =>
        this.api.patch<VehicleDto>(`admin/vehicles/${encodeURIComponent(id)}`, {
          userId,
          plate: request.plate,
          brand: request.brand,
          model: request.model,
          active: request.status === 'ACTIVE',
        }),
      ),
      map(toVehicle),
    );
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`admin/vehicles/${encodeURIComponent(id)}`);
  }

  /** El backend asigna el vehículo por id de usuario: se resuelve a partir del correo ingresado. */
  private findUserId(email: string): Observable<string> {
    const wanted = email.trim().toLowerCase();
    return this.api.get<PageResponse<UserLookupDto>>('admin/users', { q: wanted }).pipe(
      switchMap((page) => {
        const user = page.content.find((candidate) => candidate.email.toLowerCase() === wanted);
        return user
          ? of(user.id)
          : throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'No existe un usuario con ese correo.' } }));
      }),
    );
  }
}

// ---- Datos de demostración (solo con useMocks: true)

/** Titulares de ejemplo (en el backend real el correo se resuelve contra los usuarios). */
const MOCK_OWNERS: Record<string, string> = {
  'lucas.fernandez@utn.edu.ar': 'Lucas Fernández',
  'valentina.romero@utn.edu.ar': 'Valentina Romero',
  's.herrera@utn.edu.ar': 'Sofía Herrera',
  'm.gutierrez@utn.edu.ar': 'Martín Gutiérrez',
  'd.morales@utn.edu.ar': 'Diego Morales',
  'a.lopez@utn.edu.ar': 'Ana López',
  'c.perez@utn.edu.ar': 'Carlos Pérez',
  'l.mendez@utn.edu.ar': 'Laura Méndez',
  'r.sanchez@utn.edu.ar': 'Roberto Sánchez',
  'f.torres@utn.edu.ar': 'Florencia Torres',
};

const emailOf = (name: string) => Object.entries(MOCK_OWNERS).find(([, owner]) => owner === name)![0];

const vehicle = (
  id: string,
  plate: string,
  owner: string,
  brand: string,
  model: string,
  status: AdminVehicle['status'],
  date: string,
): AdminVehicle => ({
  id,
  userId: `u-${id}`,
  plate,
  ownerName: owner,
  ownerEmail: emailOf(owner),
  brand,
  model,
  status,
  registeredAt: `${date}T00:00:00-03:00`,
});

const SEED: AdminVehicle[] = [
  vehicle('v-1', 'AB123CD', 'Lucas Fernández', 'Toyota', 'Corolla', 'ACTIVE', '2025-03-12'),
  vehicle('v-2', 'GH789IJ', 'Valentina Romero', 'Volkswagen', 'Polo', 'ACTIVE', '2024-08-05'),
  vehicle('v-3', 'EF456GH', 'Valentina Romero', 'Honda', 'Wave', 'ACTIVE', '2024-08-05'),
  vehicle('v-4', 'CD456EF', 'Martín Gutiérrez', 'Fiat', 'Cronos', 'ACTIVE', '2024-11-19'),
  vehicle('v-5', 'KL321MN', 'Sofía Herrera', 'Renault', 'Sandero', 'ACTIVE', '2024-04-02'),
  vehicle('v-6', 'OP654QR', 'Diego Morales', 'Chevrolet', 'Onix', 'INACTIVE', '2025-01-21'),
  vehicle('v-7', 'ST987UV', 'Ana López', 'Peugeot', '208', 'ACTIVE', '2024-06-17'),
  vehicle('v-8', 'WX111YZ', 'Ana López', 'Yamaha', 'FZ 150', 'ACTIVE', '2024-06-17'),
  vehicle('v-9', 'AA222BB', 'Carlos Pérez', 'Ford', 'Focus', 'ACTIVE', '2023-09-30'),
  vehicle('v-10', 'CC333DD', 'Roberto Sánchez', 'Toyota', 'Hilux', 'ACTIVE', '2025-02-11'),
];

@Injectable()
export class MockVehiclesService extends VehiclesService {
  private vehicles: AdminVehicle[] = SEED.map((item) => ({ ...item }));

  list(query: ListQuery): Observable<PageResponse<AdminVehicle>> {
    const plateTerm = normalizePlate(query.search).toUpperCase();
    const filtered = this.vehicles.filter((item) => !plateTerm || item.plate.includes(plateTerm));
    const sorted = sortRows(filtered, query.sort, SORT_ACCESSORS);
    const start = query.page * query.size;
    return of({
      content: sorted.slice(start, start + query.size),
      page: query.page,
      size: query.size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / query.size),
    });
  }

  create(request: VehicleUpsertRequest): Observable<AdminVehicle> {
    const checked = this.check(request);
    if (checked instanceof HttpErrorResponse) {
      return throwError(() => checked);
    }
    const created: AdminVehicle = {
      id: `v-${crypto.randomUUID()}`,
      userId: `u-${checked.ownerEmail}`,
      plate: checked.plate,
      ownerName: checked.ownerName,
      ownerEmail: checked.ownerEmail,
      brand: request.brand,
      model: request.model,
      status: 'ACTIVE',
      registeredAt: new Date().toISOString(),
    };
    this.vehicles = [...this.vehicles, created];
    return of(created);
  }

  update(id: string, request: VehicleUpsertRequest): Observable<AdminVehicle> {
    const current = this.vehicles.find((item) => item.id === id);
    if (!current) {
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }
    const checked = this.check(request, id);
    if (checked instanceof HttpErrorResponse) {
      return throwError(() => checked);
    }
    const updated: AdminVehicle = {
      ...current,
      ...checked,
      brand: request.brand,
      model: request.model,
      status: request.status,
    };
    this.vehicles = this.vehicles.map((item) => (item.id === id ? updated : item));
    return of(updated);
  }

  delete(id: string): Observable<void> {
    if (!this.vehicles.some((item) => item.id === id)) {
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }
    this.vehicles = this.vehicles.map((item) => (item.id === id ? { ...item, status: 'INACTIVE' } : item));
    return of(undefined);
  }

  private check(request: VehicleUpsertRequest, exceptId?: string) {
    const plate = normalizePlate(request.plate);
    const ownerEmail = request.ownerEmail.trim().toLowerCase();
    const ownerName = MOCK_OWNERS[ownerEmail];
    if (!ownerName) {
      return new HttpErrorResponse({ status: 404, error: { message: 'No existe un usuario con ese correo.' } });
    }
    if (this.vehicles.some((item) => item.id !== exceptId && item.status === 'ACTIVE' && item.plate === plate)) {
      return new HttpErrorResponse({ status: 409, error: { message: 'Esa patente ya está registrada.' } });
    }
    return { plate, ownerEmail, ownerName };
  }
}

export const VEHICLES_SERVICE_PROVIDER = {
  provide: VehiclesService,
  useFactory: () => (inject(USE_MOCKS) ? new MockVehiclesService() : new HttpVehiclesService()),
};

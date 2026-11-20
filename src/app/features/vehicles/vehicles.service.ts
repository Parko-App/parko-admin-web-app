import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { PageResponse } from '../../core/models/page-response.model';
import {
  AdminVehicle,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  VehicleUpsertRequest,
} from '../../core/models/vehicle.model';
import { ApiClient } from '../../core/services/api-client.service';
import { ListQuery } from '../../shared/utils/paged-list';
import { normalizePlate } from '../../shared/utils/plate';
import { sortRows, toSortParam } from '../../shared/utils/sort';

export abstract class VehiclesService {
  abstract list(query: ListQuery): Observable<PageResponse<AdminVehicle>>;
  abstract create(request: VehicleUpsertRequest): Observable<AdminVehicle>;
  abstract update(id: string, request: VehicleUpsertRequest): Observable<AdminVehicle>;
  abstract delete(id: string): Observable<void>;
}

@Injectable()
export class HttpVehiclesService extends VehiclesService {
  private readonly api = inject(ApiClient);

  list(query: ListQuery): Observable<PageResponse<AdminVehicle>> {
    return this.api.get<PageResponse<AdminVehicle>>('admin/vehicles', {
      search: query.search.trim(),
      page: query.page,
      size: query.size,
      sort: toSortParam(query.sort),
    });
  }

  create(request: VehicleUpsertRequest): Observable<AdminVehicle> {
    return this.api.post<AdminVehicle>('admin/vehicles', request);
  }

  update(id: string, request: VehicleUpsertRequest): Observable<AdminVehicle> {
    return this.api.put<AdminVehicle>(`admin/vehicles/${encodeURIComponent(id)}`, request);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`admin/vehicles/${encodeURIComponent(id)}`);
  }
}

/** Titulares de ejemplo (en el backend real el email se resuelve contra identity). */
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
  type: AdminVehicle['type'],
  status: AdminVehicle['status'],
  date: string,
): AdminVehicle => ({
  id,
  plate,
  ownerName: owner,
  ownerEmail: emailOf(owner),
  type,
  status,
  registeredAt: `${date}T00:00:00-03:00`,
});

const SEED: AdminVehicle[] = [
  vehicle('v-1', 'AB123CD', 'Lucas Fernández', 'CAR', 'ACTIVE', '2025-03-12'),
  vehicle('v-2', 'GH789IJ', 'Valentina Romero', 'CAR', 'ACTIVE', '2024-08-05'),
  vehicle('v-3', 'EF456GH', 'Valentina Romero', 'MOTORCYCLE', 'ACTIVE', '2024-08-05'),
  vehicle('v-4', 'CD456EF', 'Martín Gutiérrez', 'CAR', 'ACTIVE', '2024-11-19'),
  vehicle('v-5', 'KL321MN', 'Sofía Herrera', 'CAR', 'ACTIVE', '2024-04-02'),
  vehicle('v-6', 'OP654QR', 'Diego Morales', 'CAR', 'SUSPENDED', '2025-01-21'),
  vehicle('v-7', 'ST987UV', 'Ana López', 'CAR', 'ACTIVE', '2024-06-17'),
  vehicle('v-8', 'WX111YZ', 'Ana López', 'MOTORCYCLE', 'ACTIVE', '2024-06-17'),
  vehicle('v-9', 'AA222BB', 'Carlos Pérez', 'CAR', 'ACTIVE', '2023-09-30'),
  vehicle('v-10', 'CC333DD', 'Roberto Sánchez', 'PICKUP', 'ACTIVE', '2025-02-11'),
];

const SORT_ACCESSORS: Record<string, (vehicle: AdminVehicle) => unknown> = {
  plate: (v) => v.plate,
  ownerName: (v) => v.ownerName,
  type: (v) => VEHICLE_TYPE_LABELS[v.type],
  status: (v) => VEHICLE_STATUS_LABELS[v.status],
  registeredAt: (v) => Date.parse(v.registeredAt),
};

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Datos de demostración en memoria (solo con useMocks: true). */
@Injectable()
export class MockVehiclesService extends VehiclesService {
  private vehicles: AdminVehicle[] = SEED.map((item) => ({ ...item }));

  list(query: ListQuery): Observable<PageResponse<AdminVehicle>> {
    const term = normalize(query.search.trim());
    const plateTerm = normalizePlate(query.search).toUpperCase();
    const filtered = this.vehicles.filter(
      (item) =>
        !term ||
        item.plate.includes(plateTerm) ||
        normalize(item.ownerName).includes(term) ||
        normalize(item.ownerEmail).includes(term),
    );
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
      plate: checked.plate,
      ownerName: checked.ownerName,
      ownerEmail: checked.ownerEmail,
      type: request.type,
      status: request.status,
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
    const updated: AdminVehicle = { ...current, ...checked, type: request.type, status: request.status };
    this.vehicles = this.vehicles.map((item) => (item.id === id ? updated : item));
    return of(updated);
  }

  delete(id: string): Observable<void> {
    if (!this.vehicles.some((item) => item.id === id)) {
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }
    this.vehicles = this.vehicles.filter((item) => item.id !== id);
    return of(undefined);
  }

  private check(request: VehicleUpsertRequest, exceptId?: string) {
    const plate = normalizePlate(request.plate);
    const ownerEmail = request.ownerEmail.trim().toLowerCase();
    const ownerName = MOCK_OWNERS[ownerEmail];
    if (!ownerName) {
      return new HttpErrorResponse({ status: 404, error: { message: 'No existe un usuario con ese correo.' } });
    }
    if (this.vehicles.some((item) => item.id !== exceptId && item.plate === plate)) {
      return new HttpErrorResponse({ status: 409 });
    }
    return { plate, ownerEmail, ownerName };
  }
}

export const VEHICLES_SERVICE_PROVIDER = {
  provide: VehiclesService,
  useFactory: () => (inject(USE_MOCKS) ? new MockVehiclesService() : new HttpVehiclesService()),
};

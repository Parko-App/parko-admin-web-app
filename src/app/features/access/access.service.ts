import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import {
  ACCESS_METHOD_LABELS,
  ACCESS_MOVEMENT_LABELS,
  ACCESS_USER_TYPE_LABELS,
  AccessMethod,
  AccessRecord,
} from '../../core/models/access.model';
import { AccessMovement, AccessUserType } from '../../core/models/dashboard.model';
import { PageResponse } from '../../core/models/page-response.model';
import { ApiClient } from '../../core/services/api-client.service';
import { ListQuery } from '../../shared/utils/paged-list';
import { normalizePlate } from '../../shared/utils/plate';
import { sortRows, toSortParam } from '../../shared/utils/sort';

export abstract class AccessService {
  abstract list(query: ListQuery): Observable<PageResponse<AccessRecord>>;
}

@Injectable()
export class HttpAccessService extends AccessService {
  private readonly api = inject(ApiClient);

  list(query: ListQuery): Observable<PageResponse<AccessRecord>> {
    return this.api.get<PageResponse<AccessRecord>>('admin/access-events', {
      search: normalizePlate(query.search),
      movement: query.filters?.['movement'] || undefined,
      page: query.page,
      size: query.size,
      sort: toSortParam(query.sort),
    });
  }
}

type Seed = [
  minutesAgo: number,
  plate: string | null,
  userName: string,
  userType: AccessUserType,
  movement: AccessMovement,
  method: AccessMethod,
];

/** Movimientos de ejemplo: desde hace unos minutos hasta ayer (relativos al momento de la consulta). */
const SEEDS: Seed[] = [
  [6, 'AB123CD', 'Lucas Fernández', 'REGISTERED', 'ENTRY', 'AUTOMATIC'],
  [14, null, 'Visitante', 'VISITOR', 'ENTRY', 'MANUAL'],
  [22, 'GH789IJ', 'Valentina Romero', 'REGISTERED', 'EXIT', 'AUTOMATIC'],
  [31, 'CD456EF', 'Martín Gutiérrez', 'REGISTERED', 'ENTRY', 'AUTOMATIC'],
  [39, 'XY987ZW', 'Visitante', 'VISITOR', 'EXIT', 'MANUAL'],
  [47, 'KL321MN', 'Sofía Herrera', 'TEACHER', 'ENTRY', 'AUTOMATIC'],
  [58, 'OP654QR', 'Diego Morales', 'REGISTERED', 'ENTRY', 'AUTOMATIC'],
  [66, 'ST987UV', 'Ana López', 'STAFF', 'EXIT', 'AUTOMATIC'],
  [83, 'EF456GH', 'Valentina Romero', 'REGISTERED', 'ENTRY', 'AUTOMATIC'],
  [97, 'AA222BB', 'Carlos Pérez', 'REGISTERED', 'EXIT', 'AUTOMATIC'],
  [112, 'WX111YZ', 'Ana López', 'STAFF', 'ENTRY', 'AUTOMATIC'],
  [130, 'CC333DD', 'Roberto Sánchez', 'REGISTERED', 'ENTRY', 'AUTOMATIC'],
  [151, null, 'Visitante', 'VISITOR', 'EXIT', 'MANUAL'],
  [175, 'AB123CD', 'Lucas Fernández', 'REGISTERED', 'EXIT', 'AUTOMATIC'],
  [203, 'KL321MN', 'Sofía Herrera', 'TEACHER', 'EXIT', 'AUTOMATIC'],
  [240, 'GH789IJ', 'Valentina Romero', 'REGISTERED', 'ENTRY', 'AUTOMATIC'],
  [290, 'CD456EF', 'Martín Gutiérrez', 'REGISTERED', 'EXIT', 'AUTOMATIC'],
  [352, 'XY987ZW', 'Visitante', 'VISITOR', 'ENTRY', 'MANUAL'],
  [410, 'OP654QR', 'Diego Morales', 'REGISTERED', 'EXIT', 'AUTOMATIC'],
  [505, 'AA222BB', 'Carlos Pérez', 'REGISTERED', 'ENTRY', 'AUTOMATIC'],
  [640, 'ST987UV', 'Ana López', 'STAFF', 'ENTRY', 'AUTOMATIC'],
  [905, 'CC333DD', 'Roberto Sánchez', 'REGISTERED', 'EXIT', 'AUTOMATIC'],
  [1130, 'AB123CD', 'Lucas Fernández', 'REGISTERED', 'ENTRY', 'AUTOMATIC'],
  [1260, 'EF456GH', 'Valentina Romero', 'REGISTERED', 'EXIT', 'AUTOMATIC'],
  [1385, null, 'Visitante', 'VISITOR', 'ENTRY', 'MANUAL'],
];

const SORT_ACCESSORS: Record<string, (record: AccessRecord) => unknown> = {
  plate: (r) => r.plate,
  movement: (r) => ACCESS_MOVEMENT_LABELS[r.movement],
  timestamp: (r) => Date.parse(r.timestamp),
  userName: (r) => r.userName,
  userType: (r) => ACCESS_USER_TYPE_LABELS[r.userType],
  method: (r) => ACCESS_METHOD_LABELS[r.method],
};

/** Datos de demostración (solo con useMocks: true). */
@Injectable()
export class MockAccessService extends AccessService {
  list(query: ListQuery): Observable<PageResponse<AccessRecord>> {
    const now = Date.now();
    const all: AccessRecord[] = SEEDS.map(([minutesAgo, plate, userName, userType, movement, method], index) => ({
      id: `E-${String(index + 1).padStart(4, '0')}`,
      plate,
      userName,
      userType,
      movement,
      method,
      timestamp: new Date(now - minutesAgo * 60_000).toISOString(),
    }));

    const term = normalizePlate(query.search);
    const movement = query.filters?.['movement'];
    const filtered = all.filter(
      (record) =>
        (!term || (record.plate ?? '').includes(term)) && (!movement || record.movement === movement),
    );
    // Sin orden elegido, el más reciente primero (como haría el backend por defecto).
    const sorted = sortRows(filtered, query.sort ?? { field: 'timestamp', direction: 'desc' }, SORT_ACCESSORS);
    const start = query.page * query.size;
    return of({
      content: sorted.slice(start, start + query.size),
      page: query.page,
      size: query.size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / query.size),
    });
  }
}

export const ACCESS_SERVICE_PROVIDER = {
  provide: AccessService,
  useFactory: () => (inject(USE_MOCKS) ? new MockAccessService() : new HttpAccessService()),
};

import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { PageResponse } from '../../core/models/page-response.model';
import {
  TOP_UP_METHOD_LABELS,
  TOP_UP_STATUS_LABELS,
  TopUp,
  TopUpMethod,
  TopUpRequest,
  TopUpStatus,
  TopUpUser,
} from '../../core/models/top-up.model';
import { ApiClient } from '../../core/services/api-client.service';
import { ListQuery } from '../../shared/utils/paged-list';
import { sortRows, toSortParam } from '../../shared/utils/sort';

export abstract class TopUpsService {
  abstract list(query: ListQuery): Observable<PageResponse<TopUp>>;
  /** Usuarios activos que coinciden con el texto (nombre, correo o legajo), para elegir a quién cargarle saldo. */
  abstract searchUsers(term: string): Observable<TopUpUser[]>;
  /** Acredita saldo a un usuario. Devuelve la carga registrada. */
  abstract create(request: TopUpRequest): Observable<TopUp>;
}

/** Respuesta resumida de GET admin/users (solo lo que usa el diálogo). */
interface UserSummaryDto {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
}

@Injectable()
export class HttpTopUpsService extends TopUpsService {
  private readonly api = inject(ApiClient);

  list(query: ListQuery): Observable<PageResponse<TopUp>> {
    return this.api.get<PageResponse<TopUp>>('admin/top-ups', {
      search: query.search.trim() || undefined,
      page: query.page,
      size: query.size,
      sort: toSortParam(query.sort),
    });
  }

  searchUsers(term: string): Observable<TopUpUser[]> {
    return this.api
      .get<PageResponse<UserSummaryDto>>('admin/users', { q: term.trim(), page: 0 })
      .pipe(
        map((page) =>
          page.content.filter((user) => user.active).map(({ id, fullName, email }) => ({ id, fullName, email })),
        ),
      );
  }

  create(request: TopUpRequest): Observable<TopUp> {
    return this.api.post<TopUp>('admin/top-ups', request);
  }
}

type Seed = [minutesAgo: number, transaction: string, userName: string, amount: number, method: TopUpMethod, status: TopUpStatus];

/** Cargas de ejemplo: desde hace unos minutos hasta ayer (relativas al momento de la consulta). */
const SEEDS: Seed[] = [
  [9, 'TX-54EFBE', 'Lucas Fernández', 5000, 'MERCADO_PAGO', 'CREDITED'],
  [25, 'TX-7A21C0', 'Valentina Romero', 2000, 'MERCADO_PAGO', 'CREDITED'],
  [48, 'TX-B90D13', 'Martín Gutiérrez', 10000, 'CASH', 'CREDITED'],
  [70, 'TX-1F6E8A', 'Sofía Herrera', 3000, 'MERCADO_PAGO', 'PENDING'],
  [95, 'TX-C43B77', 'Diego Morales', 1500, 'MERCADO_PAGO', 'CREDITED'],
  [128, 'TX-2D8F05', 'Ana López', 4000, 'MERCADO_PAGO', 'REJECTED'],
  [160, 'TX-9E5A41', 'Carlos Pérez', 2500, 'CASH', 'CREDITED'],
  [210, 'TX-6B07D2', 'Roberto Sánchez', 6000, 'MERCADO_PAGO', 'CREDITED'],
  [255, 'TX-D1C93E', 'Lucas Fernández', 1000, 'MERCADO_PAGO', 'CREDITED'],
  [330, 'TX-3A74B8', 'Valentina Romero', 5000, 'MERCADO_PAGO', 'CREDITED'],
  [410, 'TX-85F2E6', 'Martín Gutiérrez', 2000, 'MERCADO_PAGO', 'PENDING'],
  [520, 'TX-E60A19', 'Sofía Herrera', 8000, 'CASH', 'CREDITED'],
  [610, 'TX-47C5D0', 'Diego Morales', 3500, 'MERCADO_PAGO', 'CREDITED'],
  [780, 'TX-0B9E3F', 'Ana López', 1200, 'MERCADO_PAGO', 'REJECTED'],
  [900, 'TX-F18A62', 'Carlos Pérez', 7000, 'MERCADO_PAGO', 'CREDITED'],
  [1010, 'TX-5C3D97', 'Roberto Sánchez', 2200, 'CASH', 'CREDITED'],
  [1120, 'TX-A82E04', 'Lucas Fernández', 4500, 'MERCADO_PAGO', 'CREDITED'],
  [1230, 'TX-72B6F1', 'Valentina Romero', 900, 'MERCADO_PAGO', 'CREDITED'],
  [1300, 'TX-C09D58', 'Martín Gutiérrez', 5500, 'MERCADO_PAGO', 'CREDITED'],
  [1360, 'TX-19E7A3', 'Sofía Herrera', 3000, 'MERCADO_PAGO', 'CREDITED'],
  [1400, 'TX-8D40B6', 'Diego Morales', 2800, 'CASH', 'CREDITED'],
  [1425, 'TX-3F95C2', 'Ana López', 6500, 'MERCADO_PAGO', 'CREDITED'],
];

const SORT_ACCESSORS: Record<string, (topUp: TopUp) => unknown> = {
  transactionNumber: (t) => t.transactionNumber,
  userName: (t) => t.userName,
  timestamp: (t) => Date.parse(t.timestamp),
  amount: (t) => t.amount,
  method: (t) => TOP_UP_METHOD_LABELS[t.method],
  status: (t) => TOP_UP_STATUS_LABELS[t.status],
};

function emailOf(name: string): string {
  const slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '.');
  return `${slug}@frc.utn.edu.ar`;
}

const MOCK_USERS: TopUpUser[] = [...new Set(SEEDS.map((seed) => seed[2]))].map((name, index) => ({
  id: `U-${String(index + 1).padStart(4, '0')}`,
  fullName: name,
  email: emailOf(name),
}));

/** Datos de demostración (solo con useMocks: true). */
@Injectable()
export class MockTopUpsService extends TopUpsService {
  /** Cargas hechas desde el diálogo durante la sesión de demostración. */
  private readonly created: TopUp[] = [];

  searchUsers(term: string): Observable<TopUpUser[]> {
    const needle = term.trim().toLowerCase();
    return of(
      MOCK_USERS.filter((u) => u.fullName.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)),
    );
  }

  create(request: TopUpRequest): Observable<TopUp> {
    const user = MOCK_USERS.find((u) => u.id === request.userId);
    const topUp: TopUp = {
      id: `TU-NEW-${this.created.length + 1}`,
      transactionNumber: `TX-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      userName: user?.fullName ?? 'Usuario',
      userEmail: user?.email ?? '',
      timestamp: new Date().toISOString(),
      amount: request.amount,
      method: 'CASH',
      status: 'CREDITED',
    };
    this.created.unshift(topUp);
    return of(topUp);
  }

  list(query: ListQuery): Observable<PageResponse<TopUp>> {
    const now = Date.now();
    const all: TopUp[] = SEEDS.map(([minutesAgo, transactionNumber, userName, amount, method, status], index) => ({
      id: `TU-${String(index + 1).padStart(4, '0')}`,
      transactionNumber,
      userName,
      userEmail: emailOf(userName),
      timestamp: new Date(now - minutesAgo * 60_000).toISOString(),
      amount,
      method,
      status,
    }));
    all.unshift(...this.created);

    const term = query.search.trim().toLowerCase();
    const filtered = all.filter(
      (t) =>
        !term ||
        t.transactionNumber.toLowerCase().includes(term) ||
        t.userName.toLowerCase().includes(term) ||
        t.userEmail.toLowerCase().includes(term),
    );
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

export const TOP_UPS_SERVICE_PROVIDER = {
  provide: TopUpsService,
  useFactory: () => (inject(USE_MOCKS) ? new MockTopUpsService() : new HttpTopUpsService()),
};

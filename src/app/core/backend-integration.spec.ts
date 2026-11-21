import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { HttpPaymentsService } from '../features/payments/payments.service';
import { HttpReportsService } from '../features/reports/reports.service';
import { HttpUsersService } from '../features/users/users.service';
import { HttpVehiclesService } from '../features/vehicles/vehicles.service';
import { fromServerDateTime } from '../shared/utils/server-dates';
import { todayInArgentina } from '../shared/utils/dates';

const API = '/api/v1';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return TestBed.inject(HttpTestingController);
}

/** Deja pasar las microtareas para que los pedidos encadenados (switchMap) se emitan. */
const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('fechas del backend', () => {
  it('interpreta las fechas sin zona como hora de Argentina', () => {
    expect(fromServerDateTime('2026-11-21T10:47:00')).toBe('2026-11-21T10:47:00-03:00');
    expect(fromServerDateTime('2026-11-21T10:47')).toBe('2026-11-21T10:47:00-03:00');
    expect(fromServerDateTime('2026-11-21T10:47:00.123456')).toBe('2026-11-21T10:47:00.123456-03:00');
    expect(fromServerDateTime('2026-11-21T13:47:00Z')).toBe('2026-11-21T13:47:00Z');
    expect(fromServerDateTime(null)).toBeNull();
    expect(Date.parse(fromServerDateTime('2026-11-21T10:47:00'))).toBe(Date.parse('2026-11-21T13:47:00Z'));
  });
});

describe('integración: usuarios', () => {
  it('lista con q y página, y completa saldo y patentes con el detalle', async () => {
    const http = setup();
    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => new HttpUsersService()).list({ search: ' lucas ', page: 1, size: 10, sort: null }),
    );
    const list = http.expectOne((r) => r.url === `${API}/admin/users`);
    expect(list.request.params.get('q')).toBe('lucas');
    expect(list.request.params.get('page')).toBe('1');
    expect(list.request.params.has('size')).toBe(false);
    list.flush({
      content: [{ id: 'u1', studentId: '82116', fullName: 'Lucas', email: 'l@x.edu.ar', role: 'STUDENT', active: true }],
      page: 1, size: 20, totalElements: 21, totalPages: 2,
    });
    await flush();
    http.expectOne(`${API}/admin/users/u1`).flush({
      id: 'u1', studentId: '82116', fullName: 'Lucas', email: 'l@x.edu.ar', role: 'STUDENT', active: true,
      balance: 1500, vehicles: [{}, {}],
    });
    const page = await result;
    expect(page.totalPages).toBe(2);
    expect(page.content[0]).toMatchObject({ type: 'STUDENT', status: 'ACTIVE', balance: 1500, vehicleCount: 2 });
  });

  it('si falla el detalle igual muestra al usuario (sin saldo)', async () => {
    const http = setup();
    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => new HttpUsersService()).list({ search: '', page: 0, size: 10, sort: null }),
    );
    http.expectOne((r) => r.url === `${API}/admin/users`).flush({
      content: [{ id: 'u1', studentId: null, fullName: 'Ana', email: 'a@x', role: 'STAFF', active: false }],
      page: 0, size: 20, totalElements: 1, totalPages: 1,
    });
    await flush();
    http.expectOne(`${API}/admin/users/u1`).flush(null, { status: 500, statusText: 'Error' });
    const page = await result;
    expect(page.content[0]).toMatchObject({ status: 'INACTIVE', balance: null, vehicleCount: null });
  });

  it('el alta envía la contraseña y el rol; la edición hace PATCH con active', async () => {
    const http = setup();
    const service = TestBed.runInInjectionContext(() => new HttpUsersService());
    const detail = { id: 'u2', studentId: '1', fullName: 'N', email: 'n@x', role: 'STAFF', active: true, balance: 0, vehicles: [] };
    const created = firstValueFrom(service.create({ fullName: 'N', email: 'n@x', type: 'STAFF', status: 'ACTIVE', password: 'Clave-Segura-2026' }));
    const post = http.expectOne(`${API}/admin/users`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ fullName: 'N', email: 'n@x', password: 'Clave-Segura-2026', role: 'STAFF' });
    post.flush(detail);
    expect((await created).type).toBe('STAFF');

    const updated = firstValueFrom(service.update('u2', { fullName: 'N', email: 'n@x', type: 'STAFF', status: 'INACTIVE' }));
    const patch = http.expectOne(`${API}/admin/users/u2`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toMatchObject({ active: false, role: 'STAFF' });
    patch.flush({ ...detail, active: false });
    expect((await updated).status).toBe('INACTIVE');
  });
});

describe('integración: vehículos', () => {
  const dto = {
    id: 'v1', userId: 'u1', ownerName: 'Lucas', ownerEmail: 'l@x', plate: 'AB123CD', brand: 'Ford', model: 'Ka',
    active: true, createdAt: '2026-11-21T10:47:00',
  };

  it('lista por patente y convierte la fecha; oculta el sufijo de las bajas', async () => {
    const http = setup();
    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => new HttpVehiclesService()).list({ search: 'ab 123', page: 0, size: 10, sort: null }),
    );
    const req = http.expectOne((r) => r.url === `${API}/admin/vehicles`);
    expect(req.request.params.get('plate')).toBe('AB123');
    req.flush({ content: [{ ...dto, plate: 'AB123CD#abc', active: false }], page: 0, size: 20, totalElements: 1, totalPages: 1 });
    const page = await result;
    expect(page.content[0]).toMatchObject({ plate: 'AB123CD', status: 'INACTIVE', registeredAt: '2026-11-21T10:47:00-03:00' });
  });

  it('el alta resuelve el usuario por correo y envía su id', async () => {
    const http = setup();
    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => new HttpVehiclesService()).create({
        plate: 'AB123CD', ownerEmail: 'L@x', brand: 'Ford', model: 'Ka', status: 'ACTIVE',
      }),
    );
    const lookup = http.expectOne((r) => r.url === `${API}/admin/users`);
    expect(lookup.request.params.get('q')).toBe('l@x');
    lookup.flush({ content: [{ id: 'u1', email: 'l@x' }], page: 0, size: 20, totalElements: 1, totalPages: 1 });
    await flush();
    const post = http.expectOne(`${API}/admin/vehicles`);
    expect(post.request.body).toEqual({ userId: 'u1', plate: 'AB123CD', brand: 'Ford', model: 'Ka' });
    post.flush(dto);
    expect((await result).userId).toBe('u1');
  });

  it('informa cuando no existe un usuario con ese correo', async () => {
    const http = setup();
    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => new HttpVehiclesService()).create({
        plate: 'AB123CD', ownerEmail: 'nadie@x', brand: 'Ford', model: 'Ka', status: 'ACTIVE',
      }),
    ).catch((error: HttpErrorResponse) => error);
    http.expectOne((r) => r.url === `${API}/admin/users`).flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    const error = (await result) as HttpErrorResponse;
    expect(error.status).toBe(404);
    expect(error.error.message).toContain('No existe un usuario');
  });
});

describe('integración: pagos', () => {
  const detail = (status: string, amount: number | null = 3000) => ({
    id: 't1', ticketNumber: 'TKT-1', status, amount, issuedAt: '2026-11-21T08:00:00', paidAt: null,
    session: { type: 'VISITOR', plate: null, plateSnapshot: null, visitorPlate: 'XY987ZW', entryAt: '2026-11-21T08:00:00' },
    payment: null,
  });

  it('busca el ticket por número y lo convierte', async () => {
    const http = setup();
    const result = firstValueFrom(TestBed.runInInjectionContext(() => new HttpPaymentsService()).findTicket(' tkt-1 '));
    http.expectOne(`${API}/admin/tickets/number/TKT-1`).flush(detail('PENDING_PAYMENT'));
    expect(await result).toMatchObject({
      ticketNumber: 'TKT-1', status: 'PENDING', amountDue: 3000, plate: 'XY987ZW', sessionType: 'VISITOR',
      entryAt: '2026-11-21T08:00:00-03:00',
    });
  });

  it('cobra por id tras validar el monto', async () => {
    const http = setup();
    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => new HttpPaymentsService()).registerPayment({ ticketNumber: 'TKT-1', method: 'CASH', amount: 3000 }),
    );
    http.expectOne(`${API}/admin/tickets/number/TKT-1`).flush(detail('PENDING_PAYMENT'));
    await flush();
    const pay = http.expectOne(`${API}/admin/tickets/t1/pay`);
    expect(pay.request.method).toBe('POST');
    pay.flush({ ...detail('PAID'), paidAt: '2026-11-21T10:47:00', payment: { transactionId: 'tx1', paymentProvider: 'CASH', amount: 3000, createdAt: '2026-11-21T10:47:00' } });
    expect(await result).toMatchObject({ id: 'tx1', amount: 3000, method: 'CASH', paidAt: '2026-11-21T10:47:00-03:00' });
  });

  it('no cobra si el monto no coincide con el del ticket', async () => {
    const http = setup();
    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => new HttpPaymentsService()).registerPayment({ ticketNumber: 'TKT-1', method: 'CASH', amount: 100 }),
    ).catch((error: HttpErrorResponse) => error);
    http.expectOne(`${API}/admin/tickets/number/TKT-1`).flush(detail('PENDING_PAYMENT'));
    const error = (await result) as HttpErrorResponse;
    expect(error.status).toBe(400);
    expect(error.error.message).toContain('no coincide');
    http.expectNone(`${API}/admin/tickets/t1/pay`);
  });

  it('arma "cobros de hoy" con todas las páginas de tickets pagados', async () => {
    const http = setup();
    const result = firstValueFrom(TestBed.runInInjectionContext(() => new HttpPaymentsService()).listToday({ field: 'amount', direction: 'desc' }));
    const today = todayInArgentina();
    const first = http.expectOne((r) => r.url === `${API}/admin/tickets` && r.params.get('page') === '0');
    expect(first.request.params.get('from')).toBe(today);
    expect(first.request.params.get('to')).toBe(today);
    expect(first.request.params.get('status')).toBe('PAID');
    const row = (n: number, amount: number) => ({
      id: `t${n}`, ticketNumber: `TKT-${n}`, status: 'PAID', issuedAt: '2026-11-21T08:00:00', paidAt: '2026-11-21T09:00:00',
      sessionType: 'VISITOR', plate: null, amount,
    });
    first.flush({ content: [row(1, 1500)], page: 0, size: 20, totalElements: 2, totalPages: 2 });
    await flush();
    http.expectOne((r) => r.url === `${API}/admin/tickets` && r.params.get('page') === '1').flush({
      content: [row(2, 3000)], page: 1, size: 20, totalElements: 2, totalPages: 2,
    });
    const today$ = await result;
    expect(today$.count).toBe(2);
    expect(today$.totalAmount).toBe(4500);
    expect(today$.items.map((item) => item.amount)).toEqual([3000, 1500]);
  });
});

describe('integración: reportes', () => {
  const range = { from: '2026-11-15', to: '2026-11-16' };

  it('accesos: suma registrados y visitantes', async () => {
    const http = setup();
    const result = firstValueFrom(TestBed.runInInjectionContext(() => new HttpReportsService()).access(range));
    const req = http.expectOne((r) => r.url === `${API}/admin/reports/access`);
    expect(req.request.params.get('from')).toBe('2026-11-15');
    req.flush({ days: [{ date: '2026-11-15', registeredEntries: 100, registeredExits: 90, visitorEntries: 10, visitorExits: 8 }] });
    expect((await result).days[0]).toEqual({ date: '2026-11-15', entries: 110, exits: 98, visitors: 10, registered: 100 });
  });

  it('ocupación (con capacidad del entorno) y recaudación', async () => {
    const http = setup();
    const service = TestBed.runInInjectionContext(() => new HttpReportsService());
    const occupancy = firstValueFrom(service.occupancy(range));
    http.expectOne((r) => r.url === `${API}/admin/reports/occupancy`).flush({ days: [{ date: '2026-11-15', peak: 200, average: 150.5 }] });
    const report = await occupancy;
    expect(report.capacity).toBeGreaterThan(0);
    expect(report.days[0]).toEqual({ date: '2026-11-15', peak: 200, average: 150.5 });

    const revenue = firstValueFrom(service.revenue(range));
    http.expectOne((r) => r.url === `${API}/admin/reports/revenue`).flush({ days: [{ date: '2026-11-15', registered: 8000, visitors: 12000, total: 20000 }] });
    expect((await revenue).days[0]).toEqual({ date: '2026-11-15', registered: 8000, visitors: 12000 });
  });
});

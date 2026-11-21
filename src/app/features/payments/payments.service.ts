import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { SortState } from '../../core/models/sort.model';
import {
  PAYMENT_METHOD_LABELS,
  PaymentRecord,
  RegisterPaymentRequest,
  TodayPayments,
  VisitorTicket,
} from '../../core/models/payment.model';
import { ApiClient } from '../../core/services/api-client.service';
import { sortRows, toSortParam } from '../../shared/utils/sort';

export abstract class PaymentsService {
  /** Busca un ticket por su número (TKT-…) o por el contenido de su código QR. */
  abstract findTicket(code: string): Observable<VisitorTicket>;
  abstract registerPayment(request: RegisterPaymentRequest): Observable<PaymentRecord>;
  abstract listToday(sort: SortState | null): Observable<TodayPayments>;
}

@Injectable()
export class HttpPaymentsService extends PaymentsService {
  private readonly api = inject(ApiClient);

  findTicket(code: string): Observable<VisitorTicket> {
    return this.api.get<VisitorTicket>(`admin/tickets/${encodeURIComponent(code.trim())}`);
  }

  registerPayment(request: RegisterPaymentRequest): Observable<PaymentRecord> {
    return this.api.post<PaymentRecord>('admin/payments', request);
  }

  listToday(sort: SortState | null): Observable<TodayPayments> {
    return this.api.get<TodayPayments>('admin/payments/today', { sort: toSortParam(sort) });
  }
}

/** Fecha de hoy en Argentina (UTC-3), como AAAA-MM-DD. */
const todayInArgentina = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
const TODAY = todayInArgentina();
const stamp = TODAY.replaceAll('-', '');
const ticketNumber = (sequence: string) => `TKT-${stamp}-${sequence}`;
const at = (time: string) => `${TODAY}T${time}:00-03:00`;

/** Tickets de ejemplo para probar la búsqueda (solo con useMocks). */
export const MOCK_SAMPLE_TICKETS = [ticketNumber('0042'), ticketNumber('0039')];

const CASHIER = 'M. Acosta';
const payment = (sequence: string, time: string, amount: number): PaymentRecord => ({
  id: `pay-${sequence}`,
  ticketNumber: ticketNumber(sequence),
  paidAt: at(time),
  amount,
  method: 'CASH',
  cashierName: CASHIER,
});

const SORT_ACCESSORS: Record<string, (payment: PaymentRecord) => unknown> = {
  ticketNumber: (p) => p.ticketNumber,
  paidAt: (p) => Date.parse(p.paidAt),
  amount: (p) => p.amount,
  method: (p) => PAYMENT_METHOD_LABELS[p.method],
  cashierName: (p) => p.cashierName,
};

const httpError = (status: number, message: string) =>
  throwError(() => new HttpErrorResponse({ status, error: { message } }));

/** Datos de demostración en memoria (solo con useMocks: true). */
@Injectable()
export class MockPaymentsService extends PaymentsService {
  private tickets: VisitorTicket[] = [
    { ticketNumber: ticketNumber('0042'), entryAt: at('08:12'), days: 1, dailyRate: 1200, amountDue: 1200, status: 'PENDING' },
    { ticketNumber: ticketNumber('0039'), entryAt: `${TODAY}T07:40:00-03:00`, days: 2, dailyRate: 1200, amountDue: 2400, status: 'PENDING' },
    { ticketNumber: ticketNumber('0031'), entryAt: at('09:30'), days: 2, dailyRate: 1280, amountDue: 2560, status: 'PAID' },
  ];

  private payments: PaymentRecord[] = [
    payment('0031', '10:47', 2560),
    payment('0028', '10:22', 980),
    payment('0024', '09:55', 1240),
    payment('0019', '09:31', 3100),
    payment('0012', '09:04', 760),
  ];

  findTicket(code: string): Observable<VisitorTicket> {
    const wanted = code.trim().toUpperCase();
    const found = this.tickets.find((ticket) => ticket.ticketNumber === wanted);
    return found ? of({ ...found }) : httpError(404, 'No se encontró ningún ticket con ese número o código.');
  }

  registerPayment(request: RegisterPaymentRequest): Observable<PaymentRecord> {
    const ticket = this.tickets.find((item) => item.ticketNumber === request.ticketNumber);
    if (!ticket) {
      return httpError(404, 'No se encontró ningún ticket con ese número o código.');
    }
    if (ticket.status === 'PAID') {
      return httpError(409, 'El ticket ya fue cobrado.');
    }
    if (request.amount !== ticket.amountDue) {
      return httpError(400, `El monto ingresado no coincide con el total a cobrar ($${ticket.amountDue}).`);
    }
    ticket.status = 'PAID';
    const record: PaymentRecord = {
      id: `pay-${this.payments.length + 1}-${ticket.ticketNumber}`,
      ticketNumber: ticket.ticketNumber,
      paidAt: new Date().toISOString(),
      amount: ticket.amountDue,
      method: request.method,
      cashierName: CASHIER,
    };
    this.payments = [record, ...this.payments];
    return of({ ...record });
  }

  listToday(sort: SortState | null): Observable<TodayPayments> {
    const items = sortRows(this.payments, sort, SORT_ACCESSORS);
    return of({
      items,
      count: items.length,
      totalAmount: items.reduce((total, item) => total + item.amount, 0),
    });
  }
}

export const PAYMENTS_SERVICE_PROVIDER = {
  provide: PaymentsService,
  useFactory: () => (inject(USE_MOCKS) ? new MockPaymentsService() : new HttpPaymentsService()),
};

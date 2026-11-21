import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { PageResponse } from '../../core/models/page-response.model';
import { SortState } from '../../core/models/sort.model';
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  PaymentRecord,
  RegisterPaymentRequest,
  TicketSessionType,
  TicketStatus,
  TodayPayments,
  VisitorTicket,
} from '../../core/models/payment.model';
import { ApiClient } from '../../core/services/api-client.service';
import { todayInArgentina } from '../../shared/utils/dates';
import { fromServerDateTime } from '../../shared/utils/server-dates';
import { sortRows } from '../../shared/utils/sort';

export abstract class PaymentsService {
  /** Busca un ticket por su número (TKT-…) o por el contenido de su código QR. */
  abstract findTicket(code: string): Observable<VisitorTicket>;
  abstract registerPayment(request: RegisterPaymentRequest): Observable<PaymentRecord>;
  abstract listToday(sort: SortState | null): Observable<TodayPayments>;
}

const SORT_ACCESSORS: Record<string, (payment: PaymentRecord) => unknown> = {
  ticketNumber: (p) => p.ticketNumber,
  paidAt: (p) => Date.parse(p.paidAt),
  amount: (p) => p.amount,
  method: (p) => p.method ? PAYMENT_METHOD_LABELS[p.method] : null,
  cashierName: (p) => p.cashierName,
};

// ---- API real (admin-service)

type TicketDtoStatus = 'PENDING_PAYMENT' | 'PAID' | 'USED' | 'CANCELLED';

const STATUS_FROM_DTO: Record<TicketDtoStatus, TicketStatus> = {
  PENDING_PAYMENT: 'PENDING',
  PAID: 'PAID',
  USED: 'USED',
  CANCELLED: 'CANCELLED',
};

interface TicketSummaryDto {
  id: string;
  ticketNumber: string;
  status: TicketDtoStatus;
  issuedAt: string;
  paidAt: string | null;
  sessionType: TicketSessionType;
  plate: string | null;
  amount: number | null;
}

interface TicketDetailDto {
  id: string;
  ticketNumber: string;
  status: TicketDtoStatus;
  amount: number | null;
  issuedAt: string;
  paidAt: string | null;
  session: {
    type: TicketSessionType;
    plate: string | null;
    plateSnapshot: string | null;
    visitorPlate: string | null;
    entryAt: string;
  };
  payment: { transactionId: string; paymentProvider: string | null; amount: number; createdAt: string } | null;
}

const toTicket = (dto: TicketDetailDto): VisitorTicket => ({
  ticketNumber: dto.ticketNumber,
  entryAt: fromServerDateTime(dto.session.entryAt),
  plate: dto.session.plate ?? dto.session.visitorPlate ?? dto.session.plateSnapshot,
  sessionType: dto.session.type,
  amountDue: Number(dto.amount ?? 0),
  status: STATUS_FROM_DTO[dto.status],
});

const toMethod = (provider: string | null | undefined): PaymentMethod | null =>
  provider === 'CASH' ? 'CASH' : provider === 'MERCADO_PAGO' ? 'MERCADO_PAGO' : null;

@Injectable()
export class HttpPaymentsService extends PaymentsService {
  private readonly api = inject(ApiClient);

  findTicket(code: string): Observable<VisitorTicket> {
    return this.findDetail(code).pipe(map(toTicket));
  }

  /** El backend cobra por id de ticket: se busca por número, se valida el monto y se registra el cobro. */
  registerPayment(request: RegisterPaymentRequest): Observable<PaymentRecord> {
    return this.findDetail(request.ticketNumber).pipe(
      switchMap((detail) => {
        if (detail.amount !== null && request.amount !== Number(detail.amount)) {
          return throwError(
            () =>
              new HttpErrorResponse({
                status: 400,
                error: { message: `El monto ingresado no coincide con el total a cobrar ($${detail.amount}).` },
              }),
          );
        }
        return this.api.post<TicketDetailDto>(`admin/tickets/${encodeURIComponent(detail.id)}/pay`, {});
      }),
      map((paid) => ({
        id: paid.payment?.transactionId ?? paid.id,
        ticketNumber: paid.ticketNumber,
        paidAt: fromServerDateTime(paid.paidAt ?? paid.payment?.createdAt ?? paid.issuedAt),
        amount: Number(paid.payment?.amount ?? paid.amount ?? 0),
        method: 'CASH' as const,
        cashierName: null,
      })),
    );
  }

  /**
   * Tickets cobrados que se emitieron hoy (el backend filtra por fecha de emisión, no de cobro).
   * Trae todas las páginas; el orden se aplica acá porque el backend no lo recibe.
   */
  listToday(sort: SortState | null): Observable<TodayPayments> {
    const today = todayInArgentina();
    const page = (index: number) =>
      this.api.get<PageResponse<TicketSummaryDto>>('admin/tickets', { from: today, to: today, status: 'PAID', page: index });
    return page(0).pipe(
      switchMap((first) =>
        first.totalPages <= 1
          ? of(first.content)
          : forkJoin(Array.from({ length: first.totalPages - 1 }, (_, i) => page(i + 1))).pipe(
              map((rest) => [...first.content, ...rest.flatMap((next) => next.content)]),
            ),
      ),
      map((tickets) => {
        const items = sortRows(
          tickets.map<PaymentRecord>((ticket) => ({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            paidAt: fromServerDateTime(ticket.paidAt ?? ticket.issuedAt),
            amount: Number(ticket.amount ?? 0),
            method: null,
            cashierName: null,
          })),
          sort,
          SORT_ACCESSORS,
        );
        return { items, count: items.length, totalAmount: items.reduce((total, item) => total + item.amount, 0) };
      }),
    );
  }

  private findDetail(code: string): Observable<TicketDetailDto> {
    return this.api.get<TicketDetailDto>(`admin/tickets/number/${encodeURIComponent(code.trim().toUpperCase())}`);
  }
}

// ---- Datos de demostración (solo con useMocks: true)

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


const httpError = (status: number, message: string) =>
  throwError(() => new HttpErrorResponse({ status, error: { message } }));

/** Datos de demostración en memoria (solo con useMocks: true). */
@Injectable()
export class MockPaymentsService extends PaymentsService {
  private tickets: VisitorTicket[] = [
    { ticketNumber: ticketNumber('0042'), entryAt: at('08:12'), plate: 'XY987ZW', sessionType: 'VISITOR', amountDue: 3000, status: 'PENDING' },
    { ticketNumber: ticketNumber('0039'), entryAt: `${TODAY}T07:40:00-03:00`, plate: 'KL321MN', sessionType: 'REGISTERED', amountDue: 1500, status: 'PENDING' },
    { ticketNumber: ticketNumber('0031'), entryAt: at('09:30'), plate: 'AB123CD', sessionType: 'VISITOR', amountDue: 2560, status: 'PAID' },
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

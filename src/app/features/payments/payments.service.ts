import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, throwError } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { PageResponse } from '../../core/models/page-response.model';
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  PaymentRecord,
  RegisterPaymentRequest,
  TICKET_STATUS_LABELS,
  TicketExtras,
  TicketRow,
  TicketSessionType,
  TicketStatus,
  VisitorTicket,
} from '../../core/models/payment.model';
import { ApiClient } from '../../core/services/api-client.service';
import { todayInArgentina } from '../../shared/utils/dates';
import { ListQuery } from '../../shared/utils/paged-list';
import { fromServerDateTime } from '../../shared/utils/server-dates';
import { sortRows, toSortParam } from '../../shared/utils/sort';

export abstract class PaymentsService {
  /** Busca un ticket por su número (TKT-…) o por el contenido de su código QR. */
  abstract findTicket(code: string): Observable<VisitorTicket>;
  abstract registerPayment(request: RegisterPaymentRequest): Observable<PaymentRecord>;
  /** Todos los tickets (más recientes primero), paginados y ordenados por el servidor. */
  abstract listTickets(query: ListQuery): Observable<PageResponse<TicketRow>>;
  /** Saldo actual del usuario y contenido del QR del ticket; se consultan al abrir el detalle o bajar el PDF. */
  abstract ticketExtras(ticketId: string): Observable<TicketExtras>;
}

/** Orden en memoria de la demostración; en la API real lo hace el servidor (ticketNumber, issuedAt, status). */
const SORT_ACCESSORS: Record<string, (row: TicketRow) => unknown> = {
  ticketNumber: (r) => r.ticketNumber,
  issuedAt: (r) => Date.parse(r.issuedAt),
  status: (r) => TICKET_STATUS_LABELS[r.status],
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
  paymentMethod: string | null;
  cashierName: string | null;
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
  qrData?: string | null;
  owner?: { balance: number | null } | null;
}

const toTicket = (dto: TicketDetailDto): VisitorTicket => ({
  ticketNumber: dto.ticketNumber,
  entryAt: fromServerDateTime(dto.session.entryAt),
  plate: dto.session.plate ?? dto.session.visitorPlate ?? dto.session.plateSnapshot,
  sessionType: dto.session.type,
  amountDue: Number(dto.amount ?? 0),
  status: STATUS_FROM_DTO[dto.status],
});

const toMethod = (method: string | null | undefined): PaymentMethod | null =>
  method === 'CASH' || method === 'MERCADO_PAGO' || method === 'BALANCE' ? method : null;

const toRow = (dto: TicketSummaryDto): TicketRow => ({
  id: dto.id,
  ticketNumber: dto.ticketNumber,
  issuedAt: fromServerDateTime(dto.issuedAt),
  paidAt: fromServerDateTime(dto.paidAt),
  status: STATUS_FROM_DTO[dto.status],
  sessionType: dto.sessionType,
  plate: dto.plate,
  amount: dto.amount === null ? null : Number(dto.amount),
  method: toMethod(dto.paymentMethod),
  cashierName: dto.cashierName,
});

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

  listTickets(query: ListQuery): Observable<PageResponse<TicketRow>> {
    return this.api
      .get<PageResponse<TicketSummaryDto>>('admin/tickets', { page: query.page, sort: toSortParam(query.sort) })
      .pipe(map((page) => ({ ...page, content: page.content.map(toRow) })));
  }

  ticketExtras(ticketId: string): Observable<TicketExtras> {
    return this.api.get<TicketDetailDto>(`admin/tickets/${encodeURIComponent(ticketId)}`).pipe(
      map((dto) => ({
        qrData: dto.qrData ?? null,
        balance: dto.owner?.balance === null || dto.owner?.balance === undefined ? null : Number(dto.owner.balance),
      })),
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
const payment = (
  sequence: string,
  time: string,
  amount: number,
  method: PaymentMethod = 'CASH',
  cashierName: string | null = CASHIER,
): PaymentRecord => ({
  id: `pay-${sequence}`,
  ticketNumber: ticketNumber(sequence),
  paidAt: at(time),
  amount,
  method,
  cashierName,
});

/** Tickets que ya no están pendientes ni se cobraron hoy: sirven para ver todos los estados en la demostración. */
const EXTRA_ROWS: TicketRow[] = [
  {
    id: 'row-0008', ticketNumber: ticketNumber('0008'), issuedAt: at('06:50'), paidAt: at('07:05'), status: 'USED',
    sessionType: 'REGISTERED', plate: 'GH789IJ', amount: 1500, method: 'BALANCE', cashierName: null,
  },
  {
    id: 'row-0005', ticketNumber: ticketNumber('0005'), issuedAt: at('06:10'), paidAt: null, status: 'CANCELLED',
    sessionType: 'VISITOR', plate: 'MN456OP', amount: 3000, method: null, cashierName: null,
  },
];


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
    payment('0028', '10:22', 980, 'MERCADO_PAGO', null),
    payment('0024', '09:55', 1240),
    payment('0019', '09:31', 3100, 'BALANCE', null),
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

  /** Demostración: los usuarios registrados tienen saldo, los visitantes no; el QR es un link de pago de ejemplo. */
  ticketExtras(ticketId: string): Observable<TicketExtras> {
    const ticketNumber$ = ticketId.replace(/^row-/, '');
    return of({
      qrData: `https://parko.example/pagar/${ticketNumber$}`,
      balance: ticketNumber$.endsWith('0039') || ticketNumber$.endsWith('0008') ? 12500 : null,
    });
  }

  listTickets(query: ListQuery): Observable<PageResponse<TicketRow>> {
    const paymentOf = (number: string) => this.payments.find((p) => p.ticketNumber === number);
    const known = new Set(this.tickets.map((t) => t.ticketNumber));

    const fromTickets = this.tickets.map<TicketRow>((t) => {
      const paid = t.status === 'PAID' ? paymentOf(t.ticketNumber) : undefined;
      return {
        id: `row-${t.ticketNumber}`,
        ticketNumber: t.ticketNumber,
        issuedAt: t.entryAt,
        paidAt: paid?.paidAt ?? null,
        status: t.status,
        sessionType: t.sessionType,
        plate: t.plate,
        amount: t.amountDue,
        method: paid?.method ?? null,
        cashierName: paid?.cashierName ?? null,
      };
    });
    // Cobros de hoy sin ticket cargado en la demostración: se muestran como tickets pagados.
    const fromPayments = this.payments
      .filter((p) => !known.has(p.ticketNumber))
      .map<TicketRow>((p) => ({
        id: `row-${p.id}`,
        ticketNumber: p.ticketNumber,
        issuedAt: new Date(Date.parse(p.paidAt) - 27 * 60_000).toISOString(),
        paidAt: p.paidAt,
        status: 'PAID',
        sessionType: 'VISITOR',
        plate: null,
        amount: p.amount,
        method: p.method,
        cashierName: p.cashierName,
      }));

    const sorted = sortRows(
      [...fromTickets, ...fromPayments, ...EXTRA_ROWS],
      query.sort ?? { field: 'issuedAt', direction: 'desc' },
      SORT_ACCESSORS,
    );
    const start = query.page * query.size;
    return of({
      content: sorted.slice(start, start + query.size),
      page: query.page,
      size: query.size,
      totalElements: sorted.length,
      totalPages: Math.ceil(sorted.length / query.size),
    });
  }
}

export const PAYMENTS_SERVICE_PROVIDER = {
  provide: PaymentsService,
  useFactory: () => (inject(USE_MOCKS) ? new MockPaymentsService() : new HttpPaymentsService()),
};

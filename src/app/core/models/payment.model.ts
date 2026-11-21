/**
 * Pagos (admin-service):
 *   GET  admin/tickets/number/{ticketNumber}  -> ticket (404 si no existe)
 *   POST admin/tickets/{id}/pay               -> cobro en efectivo (409 si el ticket no está pendiente)
 *   GET  admin/tickets?from=&to=&status=&page= -> listado paginado (para "Cobros realizados hoy")
 * El importe lo fija el backend (tarifa de visitante o de usuario registrado).
 */

export type TicketStatus = 'PENDING' | 'PAID' | 'USED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'MERCADO_PAGO';
export type TicketSessionType = 'REGISTERED' | 'VISITOR';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: 'Pendiente de cobro',
  PAID: 'Cobrado',
  USED: 'Utilizado',
  CANCELLED: 'Cancelado',
};

export const TICKET_SESSION_TYPE_LABELS: Record<TicketSessionType, string> = {
  REGISTERED: 'Usuario registrado',
  VISITOR: 'Visitante',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  MERCADO_PAGO: 'Mercado Pago',
};

export interface VisitorTicket {
  ticketNumber: string;
  entryAt: string;
  plate: string | null;
  sessionType: TicketSessionType;
  amountDue: number;
  status: TicketStatus;
}

export interface PaymentRecord {
  id: string;
  ticketNumber: string;
  paidAt: string;
  amount: number;
  /** null si el listado del backend no informa el método. */
  method: PaymentMethod | null;
  /** null: el backend solo guarda el identificador del administrador que cobró. */
  cashierName: string | null;
}

export interface TodayPayments {
  items: PaymentRecord[];
  count: number;
  totalAmount: number;
}

export interface RegisterPaymentRequest {
  ticketNumber: string;
  method: PaymentMethod;
  /** Monto que se cobra; se valida contra el total del ticket. */
  amount: number;
}

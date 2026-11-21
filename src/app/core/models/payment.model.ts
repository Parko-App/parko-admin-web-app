/**
 * Contratos SUPUESTOS del módulo de Pagos (a confirmar con el backend):
 *   GET  admin/tickets/{codigo}      -> VisitorTicket (404 si no existe)
 *   POST admin/payments              -> PaymentRecord (409 si el ticket ya fue cobrado)
 *   GET  admin/payments/today?sort=  -> TodayPayments
 */

export type TicketStatus = 'PENDING' | 'PAID';
export type PaymentMethod = 'CASH';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: 'Pendiente de cobro',
  PAID: 'Cobrado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
};

/** Ticket de un visitante. El importe lo calcula el backend (tarifa por día). */
export interface VisitorTicket {
  ticketNumber: string;
  entryAt: string;
  days: number;
  dailyRate: number;
  amountDue: number;
  status: TicketStatus;
}

export interface PaymentRecord {
  id: string;
  ticketNumber: string;
  paidAt: string;
  amount: number;
  method: PaymentMethod;
  cashierName: string;
}

export interface TodayPayments {
  items: PaymentRecord[];
  count: number;
  totalAmount: number;
}

export interface RegisterPaymentRequest {
  ticketNumber: string;
  method: PaymentMethod;
  /** Monto que se cobra; el backend lo valida contra el total del ticket. */
  amount: number;
  /** Observaciones del cajero. Opcional. */
  notes?: string;
}

/**
 * Tickets (antes "Pagos", admin-service):
 *   GET  admin/tickets/number/{ticketNumber}  -> ticket (404 si no existe)
 *   POST admin/tickets/{id}/pay               -> cobro en efectivo (409 si el ticket no está pendiente)
 *   GET  admin/tickets?from=&to=&status=&page=&sort= -> listado paginado de TODOS los tickets, con el método de pago
 *        y, si se cobró en efectivo, el administrador que registró el cobro (cajero)
 * El importe lo fija el backend (tarifa de visitante o de usuario registrado).
 */

export type TicketStatus = 'PENDING' | 'PAID' | 'USED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'MERCADO_PAGO' | 'BALANCE';
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
  BALANCE: 'Saldo Parko',
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

/** Datos que solo trae el detalle de un ticket y que necesita el comprobante. */
export interface TicketExtras {
  /** Contenido del QR del ticket (columna qr_data). */
  qrData: string | null;
  /** Saldo actual del usuario dueño del vehículo. null para visitantes (no tienen cuenta). */
  balance: number | null;
}

/** Fila del listado de tickets de la pantalla Tickets. */
export interface TicketRow {
  id: string;
  ticketNumber: string;
  issuedAt: string;
  /** null mientras el ticket no se cobró. */
  paidAt: string | null;
  status: TicketStatus;
  sessionType: TicketSessionType;
  plate: string | null;
  /** null si el backend todavía no puede calcularlo (usuario registrado sin cobro). */
  amount: number | null;
  /** Solo en tickets cobrados. */
  method: PaymentMethod | null;
  /** Administrador que registró el cobro (solo efectivo). */
  cashierName: string | null;
}

export interface RegisterPaymentRequest {
  ticketNumber: string;
  method: PaymentMethod;
  /** Monto que se cobra; se valida contra el total del ticket. */
  amount: number;
}

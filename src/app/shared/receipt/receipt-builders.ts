import {
  PAYMENT_METHOD_LABELS,
  PaymentRecord,
  TICKET_SESSION_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TicketExtras,
  TicketRow,
} from '../../core/models/payment.model';
import { TOP_UP_METHOD_LABELS, TopUp } from '../../core/models/top-up.model';
import { formatDateAr, formatTimeAr } from '../utils/argentina-time';
import { formatPlate } from '../utils/plate';
import { formatPesos } from './receipt-pdf';
import { ReceiptData } from './receipt.model';

/** Pago de un ticket de visitante: resta (rojo). */
export function paymentReceipt(payment: PaymentRecord): ReceiptData {
  return {
    code: payment.ticketNumber,
    title: 'Pago realizado',
    subtitle: 'Ingreso al estacionamiento',
    rows: [
      { label: 'N° Ticket', value: payment.ticketNumber },
      { label: 'Fecha', value: formatDateAr(payment.paidAt) },
      { label: 'Hora', value: formatTimeAr(payment.paidAt) },
      ...(payment.method ? [{ label: 'Método', value: PAYMENT_METHOD_LABELS[payment.method] }] : []),
      ...(payment.cashierName ? [{ label: 'Cajero', value: payment.cashierName }] : []),
    ],
    amount: payment.amount,
    direction: 'debit',
    withQr: true,
  };
}

/**
 * Comprobante de un ticket de la pantalla Tickets. Si está cobrado, es el comprobante del pago; si está pendiente,
 * es el ticket a cobrar y su PDF lleva el QR del ticket (qr_data) para escanearlo y pagarlo.
 * En ambos casos suma el saldo del usuario al momento de la consulta (los visitantes no tienen cuenta).
 */
export function ticketReceipt(row: TicketRow, extras: TicketExtras): ReceiptData {
  const balanceRow = extras.balance !== null ? [{ label: 'Saldo del usuario', value: formatPesos(extras.balance) }] : [];

  if (row.status !== 'PENDING') {
    const paid = paymentReceipt({
      id: row.id,
      ticketNumber: row.ticketNumber,
      paidAt: row.paidAt ?? row.issuedAt,
      amount: row.amount ?? 0,
      method: row.method,
      cashierName: row.cashierName,
    });
    return { ...paid, rows: [...paid.rows, ...balanceRow] };
  }

  return {
    code: row.ticketNumber,
    title: 'Ticket pendiente de pago',
    subtitle: 'Ingreso al estacionamiento',
    rows: [
      { label: 'N° Ticket', value: row.ticketNumber },
      { label: 'Estado', value: TICKET_STATUS_LABELS[row.status] },
      { label: 'Tipo', value: TICKET_SESSION_TYPE_LABELS[row.sessionType] },
      ...(row.plate ? [{ label: 'Patente', value: formatPlate(row.plate) }] : []),
      { label: 'Fecha de emisión', value: formatDateAr(row.issuedAt) },
      { label: 'Hora de emisión', value: formatTimeAr(row.issuedAt) },
      ...balanceRow,
    ],
    amount: row.amount ?? 0,
    direction: 'neutral',
    withQr: true,
    ...(extras.qrData ? { qrData: extras.qrData } : {}),
  };
}

/** Carga de saldo de un usuario: suma (verde) solo si fue acreditada. Sin código QR. */
export function topUpReceipt(topUp: TopUp): ReceiptData {
  return {
    code: topUp.transactionNumber,
    title: 'Carga de Saldo',
    subtitle: 'Carga de saldo',
    rows: [
      { label: 'N° Transacción', value: `#${topUp.transactionNumber}` },
      { label: 'Usuario', value: topUp.userName },
      { label: 'Fecha', value: formatDateAr(topUp.timestamp) },
      { label: 'Hora', value: formatTimeAr(topUp.timestamp) },
      { label: 'Método', value: TOP_UP_METHOD_LABELS[topUp.method] },
    ],
    amount: topUp.amount,
    direction: topUp.status === 'CREDITED' ? 'credit' : 'neutral',
    withQr: false,
  };
}

import { PaymentRecord, PAYMENT_METHOD_LABELS } from '../../core/models/payment.model';
import { TOP_UP_METHOD_LABELS, TopUp } from '../../core/models/top-up.model';
import { formatDateAr, formatTimeAr } from '../utils/argentina-time';
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
      { label: 'Método', value: PAYMENT_METHOD_LABELS[payment.method] },
      { label: 'Cajero', value: payment.cashierName },
    ],
    amount: payment.amount,
    direction: 'debit',
  };
}

/** Carga de saldo de un usuario: suma (verde) solo si fue acreditada. */
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
  };
}

export interface ReceiptRow {
  label: string;
  value: string;
}

/**
 * Datos de un comprobante (el mismo contenido se muestra en el detalle y se imprime en el PDF).
 * `direction`: "credit" suma (verde, +), "debit" resta (rojo, −), "neutral" no muestra signo.
 */
export interface ReceiptData {
  /** Número de transacción o de ticket: va en el código QR y en el nombre del archivo. */
  code: string;
  title: string;
  subtitle: string;
  rows: ReceiptRow[];
  amount: number;
  direction: 'credit' | 'debit' | 'neutral';
}

import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaymentRecord } from '../../core/models/payment.model';
import { TopUp } from '../../core/models/top-up.model';
import { ReceiptDialogComponent } from '../components/receipt-dialog/receipt-dialog.component';
import { paymentReceipt, topUpReceipt } from './receipt-builders';
import { buildReceiptPdf, receiptAmountText, receiptFileName } from './receipt-pdf';
import { qrMatrix } from './qr';

registerLocaleData(localeEsAr, 'es-AR');

const payment: PaymentRecord = {
  id: 'P-1',
  ticketNumber: 'TKT-20261121-0042',
  paidAt: '2026-11-21T13:47:00Z',
  amount: 2560,
  method: 'CASH',
  cashierName: 'M. Acosta',
};
const topUp: TopUp = {
  id: 'TU-1',
  transactionNumber: 'TX-54EFBE',
  userName: 'Lucas Fernández',
  userEmail: 'lucas@frc.utn.edu.ar',
  timestamp: '2026-11-21T13:47:00Z',
  amount: 5000,
  method: 'MERCADO_PAGO',
  status: 'CREDITED',
};

async function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

describe('Comprobantes', () => {
  it('el pago resta (rojo) y la carga acreditada suma (verde)', () => {
    const p = paymentReceipt(payment);
    expect(p.title).toBe('Pago realizado');
    expect(p.direction).toBe('debit');
    expect(receiptAmountText(p)).toBe('- $2.560');
    expect(p.rows.find((r) => r.label === 'Hora')?.value).toBe('10:47');

    const t = topUpReceipt(topUp);
    expect(t.direction).toBe('credit');
    expect(receiptAmountText(t)).toBe('+ $5.000');
    expect(topUpReceipt({ ...topUp, status: 'PENDING' }).direction).toBe('neutral');
    expect(receiptFileName(t)).toBe('comprobante-TX-54EFBE.pdf');
  });

  it('genera una matriz de QR cuadrada', async () => {
    const matrix = await qrMatrix('TX-54EFBE');
    expect(matrix.length).toBeGreaterThan(20);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
  });

  it('genera un PDF válido', async () => {
    const blob = await buildReceiptPdf(paymentReceipt(payment));
    expect(blob.type).toBe('application/pdf');
    expect((await readBlob(blob)).startsWith('%PDF')).toBe(true);
  });

  it('el diálogo muestra el monto con signo y deshabilita el PDF si se pide', async () => {
    TestBed.configureTestingModule({ imports: [ReceiptDialogComponent], providers: [{ provide: LOCALE_ID, useValue: 'es-AR' }] });
    const fixture = TestBed.createComponent(ReceiptDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('data', paymentReceipt(payment));
    fixture.componentRef.setInput('pdfEnabled', false);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pago realizado');
    expect(el.querySelector('.receipt__amount--debit')?.textContent?.trim()).toBe('- $2.560');
    expect(el.querySelector('svg.receipt__qr')).not.toBeNull();
    const pdf = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Generar PDF'));
    expect(pdf?.disabled).toBe(true);
  });
});

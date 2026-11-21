import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../core/notifications/toast.service';
import { downloadBlob } from '../utils/csv';
import { buildReceiptPdf, receiptFileName } from './receipt-pdf';
import { ReceiptData } from './receipt.model';

/** Genera el comprobante en PDF y lo descarga (la librería de PDF se carga recién al primer uso). */
@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private readonly toast = inject(ToastService);

  async download(data: ReceiptData): Promise<boolean> {
    try {
      downloadBlob(receiptFileName(data), await buildReceiptPdf(data));
      this.toast.success('Se descargó el comprobante en PDF.');
      return true;
    } catch {
      this.toast.error('No se pudo generar el comprobante. Intentá de nuevo.');
      return false;
    }
  }
}

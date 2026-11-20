import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { USE_MOCKS } from '../../core/config/tokens';
import { toErrorMessage } from '../../core/http/error-message';
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  RegisterPaymentRequest,
  TICKET_STATUS_LABELS,
  TicketStatus,
  TodayPayments,
  VisitorTicket,
} from '../../core/models/payment.model';
import { SortState } from '../../core/models/sort.model';
import { ToastService } from '../../core/notifications/toast.service';
import { AsyncStateComponent } from '../../shared/components/async-state/async-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { BadgeVariant, StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CurrencyArPipe } from '../../shared/pipes/currency-ar.pipe';
import { DateTimeArPipe } from '../../shared/pipes/date-time-ar.pipe';
import { AsyncStatus } from '../../shared/utils/async-state';
import { PaymentFormModalComponent } from './payment-form-modal/payment-form-modal.component';
import { MOCK_SAMPLE_TICKETS, PaymentsService } from './payments.service';

const TICKET_VARIANTS: Record<TicketStatus, BadgeVariant> = { PENDING: 'warning', PAID: 'success' };

@Component({
  selector: 'app-payments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    AsyncStateComponent,
    ConfirmDialogComponent,
    SortHeaderComponent,
    StatusBadgeComponent,
    CurrencyArPipe,
    DateTimeArPipe,
    PaymentFormModalComponent,
  ],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent {
  private readonly service = inject(PaymentsService);
  private readonly toast = inject(ToastService);
  private readonly currency = new CurrencyArPipe();

  /** La pista con tickets de ejemplo solo tiene sentido con datos de demostración. */
  protected readonly sampleTickets = inject(USE_MOCKS) ? MOCK_SAMPLE_TICKETS : [];

  protected readonly codeControl = new FormControl('', { nonNullable: true });
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly ticket = signal<VisitorTicket | null>(null);
  protected readonly confirming = signal(false);
  protected readonly charging = signal(false);

  protected readonly manualOpen = signal(false);
  protected readonly manualSaving = signal(false);
  protected readonly manualError = signal<string | null>(null);

  protected readonly status = signal<AsyncStatus>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly today = signal<TodayPayments | null>(null);
  protected readonly sort = signal<SortState | null>(null);
  private loadSequence = 0;

  protected readonly confirmMessage = computed(() => {
    const ticket = this.ticket();
    return ticket
      ? `¿Confirmás el cobro de ${this.currency.transform(ticket.amountDue)} en efectivo del ticket ${ticket.ticketNumber}?`
      : '';
  });

  constructor() {
    void this.loadToday();
  }

  protected statusLabel(status: TicketStatus): string { return TICKET_STATUS_LABELS[status]; }
  protected statusVariant(status: TicketStatus): BadgeVariant { return TICKET_VARIANTS[status]; }
  protected methodLabel(method: PaymentMethod): string { return PAYMENT_METHOD_LABELS[method]; }

  protected async search(): Promise<void> {
    const code = this.codeControl.value.trim();
    if (!code) {
      this.ticket.set(null);
      this.searchError.set('Ingresá el número de ticket o el código QR.');
      return;
    }
    this.searching.set(true);
    this.searchError.set(null);
    this.ticket.set(null);
    try {
      this.ticket.set(await firstValueFrom(this.service.findTicket(code)));
    } catch (error) {
      this.searchError.set(toErrorMessage(error));
    } finally {
      this.searching.set(false);
    }
  }

  protected askCharge(): void {
    this.confirming.set(true);
  }

  protected cancelCharge(): void {
    if (!this.charging()) {
      this.confirming.set(false);
    }
  }

  protected async confirmCharge(): Promise<void> {
    const ticket = this.ticket();
    if (!ticket || this.charging()) {
      return;
    }
    this.charging.set(true);
    try {
      const record = await firstValueFrom(
        this.service.registerPayment({ ticketNumber: ticket.ticketNumber, method: 'CASH', amount: ticket.amountDue }),
      );
      this.confirming.set(false);
      this.toast.success(`Cobro registrado: ${this.currency.transform(record.amount)} (${record.ticketNumber}).`);
      this.ticket.set({ ...ticket, status: 'PAID' });
      void this.loadToday();
    } catch (error) {
      this.confirming.set(false);
      this.toast.error(toErrorMessage(error));
    } finally {
      this.charging.set(false);
    }
  }

  protected openManual(): void {
    this.manualError.set(null);
    this.manualOpen.set(true);
  }

  protected closeManual(): void {
    if (!this.manualSaving()) {
      this.manualOpen.set(false);
    }
  }

  /** Pago en efectivo cargado a mano (sin pasar por la búsqueda de ticket). */
  protected async registerManual(request: RegisterPaymentRequest): Promise<void> {
    this.manualSaving.set(true);
    this.manualError.set(null);
    try {
      const record = await firstValueFrom(this.service.registerPayment(request));
      this.manualOpen.set(false);
      const change = request.receivedAmount !== undefined ? request.receivedAmount - request.amount : 0;
      const changeText = change > 0 ? ` Vuelto: ${this.currency.transform(change)}.` : '';
      this.toast.success(`Pago registrado: ${this.currency.transform(record.amount)} (${record.ticketNumber}).${changeText}`);
      // Si ese ticket está abierto en la búsqueda, refleja el nuevo estado.
      const open = this.ticket();
      if (open?.ticketNumber === record.ticketNumber) {
        this.ticket.set({ ...open, status: 'PAID' });
      }
      void this.loadToday();
    } catch (error) {
      this.manualError.set(toErrorMessage(error));
    } finally {
      this.manualSaving.set(false);
    }
  }

  protected changeSort(sort: SortState): void {
    this.sort.set(sort);
    void this.loadToday();
  }

  protected reload(): void {
    void this.loadToday();
  }

  protected countLabel(count: number): string {
    return count === 1 ? '1 cobro registrado' : `${count} cobros registrados`;
  }

  /** Si llegan dos respuestas desordenadas, solo vale la de la última consulta. */
  private async loadToday(): Promise<void> {
    const sequence = ++this.loadSequence;
    this.status.set('loading');
    try {
      const result = await firstValueFrom(this.service.listToday(this.sort()));
      if (sequence !== this.loadSequence) {
        return;
      }
      this.today.set(result);
      this.error.set(null);
      this.status.set(result.items.length === 0 ? 'empty' : 'success');
    } catch (error) {
      if (sequence !== this.loadSequence) {
        return;
      }
      this.error.set(toErrorMessage(error));
      this.status.set('error');
    }
  }
}

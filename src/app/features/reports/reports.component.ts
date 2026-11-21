import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import { DateRange, REPORT_TYPE_LABELS, ReportType } from '../../core/models/report.model';
import { ToastService } from '../../core/notifications/toast.service';
import { AsyncStateComponent } from '../../shared/components/async-state/async-state.component';
import { downloadBlob, downloadTextFile } from '../../shared/utils/csv';
import { addDays, daysBetween, todayInArgentina } from '../../shared/utils/dates';
import { AsyncStatus } from '../../shared/utils/async-state';
import { AccessViewComponent } from './views/access-view.component';
import { OccupancyViewComponent } from './views/occupancy-view.component';
import { RevenueViewComponent } from './views/revenue-view.component';
import { ReportsService } from './reports.service';
import { ReportResult, buildReportCsv, hasData, reportFileName } from './report-export';

/** Rango máximo por consulta; evita pedidos enormes (el límite real lo definirá el backend). */
export const MAX_RANGE_DAYS = 366;
const DEFAULT_RANGE_DAYS = 7;

function rangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('from')?.value as string;
  const to = group.get('to')?.value as string;
  if (!from || !to) {
    return null;
  }
  if (from > to) {
    return { order: true };
  }
  if (to > todayInArgentina()) {
    return { future: true };
  }
  return daysBetween(from, to) > MAX_RANGE_DAYS ? { tooLong: true } : null;
}

@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    AsyncStateComponent,
    OccupancyViewComponent,
    RevenueViewComponent,
    AccessViewComponent,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  private readonly service = inject(ReportsService);
  private readonly toast = inject(ToastService);

  protected readonly types = Object.entries(REPORT_TYPE_LABELS) as [ReportType, string][];
  protected readonly maxDate = todayInArgentina();
  protected readonly maxRangeDays = MAX_RANGE_DAYS;

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      type: ['OCCUPANCY' as ReportType, Validators.required],
      from: [addDays(todayInArgentina(), -(DEFAULT_RANGE_DAYS - 1)), Validators.required],
      to: [todayInArgentina(), Validators.required],
    },
    { validators: rangeValidator },
  );
  protected readonly attempted = signal(false);

  protected readonly status = signal<AsyncStatus>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<ReportResult | null>(null);
  protected readonly exportingPdf = signal(false);
  private sequence = 0;

  protected readonly canExport = computed(() => {
    const result = this.result();
    return this.status() === 'success' && result !== null && hasData(result);
  });

  constructor() {
    void this.generate();
  }

  protected rangeError(): string | null {
    const errors = this.form.errors;
    if (!errors) {
      return this.attempted() && this.form.invalid ? 'Completá las fechas del reporte.' : null;
    }
    if (errors['order']) {
      return 'La fecha "Desde" no puede ser posterior a "Hasta".';
    }
    if (errors['future']) {
      return 'La fecha "Hasta" no puede ser futura.';
    }
    return `El rango no puede superar los ${MAX_RANGE_DAYS} días.`;
  }

  protected async generate(): Promise<void> {
    this.attempted.set(true);
    if (this.form.invalid) {
      return;
    }
    const { type, from, to } = this.form.getRawValue();
    const range: DateRange = { from, to };
    const sequence = ++this.sequence;
    this.status.set('loading');
    this.error.set(null);
    try {
      const next = await this.fetch(type, range);
      if (sequence !== this.sequence) {
        return;
      }
      this.result.set(next);
      this.status.set(hasData(next) ? 'success' : 'empty');
    } catch (error) {
      if (sequence !== this.sequence) {
        return;
      }
      this.error.set(toErrorMessage(error));
      this.status.set('error');
    }
  }

  protected exportCsv(): void {
    const result = this.result();
    if (!result || !this.canExport()) {
      return;
    }
    downloadTextFile(reportFileName(result, 'csv'), buildReportCsv(result));
    this.toast.success('Se descargó el reporte en CSV.');
  }

  /** Genera el PDF en el navegador y lo descarga directamente (sin pasar por el diálogo de impresión). */
  protected async exportPdf(): Promise<void> {
    const result = this.result();
    if (!result || !this.canExport() || this.exportingPdf()) {
      return;
    }
    this.exportingPdf.set(true);
    try {
      const { buildReportPdf } = await import('./report-pdf');
      downloadBlob(reportFileName(result, 'pdf'), await buildReportPdf(result));
      this.toast.success('Se descargó el reporte en PDF.');
    } catch {
      this.toast.error('No se pudo generar el PDF. Intentá de nuevo.');
    } finally {
      this.exportingPdf.set(false);
    }
  }

  private async fetch(type: ReportType, range: DateRange): Promise<ReportResult> {
    switch (type) {
      case 'OCCUPANCY':
        return { type, range, data: await firstValueFrom(this.service.occupancy(range)) };
      case 'REVENUE':
        return { type, range, data: await firstValueFrom(this.service.revenue(range)) };
      case 'ACCESS':
        return { type, range, data: await firstValueFrom(this.service.access(range)) };
    }
  }
}

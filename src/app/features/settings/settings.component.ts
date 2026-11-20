import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { firstValueFrom, map } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import { SystemSettings } from '../../core/models/settings.model';
import { ToastService } from '../../core/notifications/toast.service';
import { AsyncStateComponent } from '../../shared/components/async-state/async-state.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { CurrencyArPipe } from '../../shared/pipes/currency-ar.pipe';
import { AsyncStatus } from '../../shared/utils/async-state';
import { SettingsService } from './settings.service';

type Unit = 'money' | 'percent' | 'plates' | 'spaces' | 'time';

interface FieldInfo {
  /** Ruta dentro del formulario (por ejemplo, "plateLimits.students"). */
  path: string;
  /** Nombre que se muestra en el resumen de cambios. */
  label: string;
  unit: Unit;
}

/** Campos auditados, en el orden en que aparecen en pantalla. */
const FIELDS: readonly FieldInfo[] = [
  { path: 'registeredDailyRate', label: 'Costo por día (usuarios registrados)', unit: 'money' },
  { path: 'visitorDailyRate', label: 'Costo por día visitante', unit: 'money' },
  { path: 'motorcycleDailyRate', label: 'Costo por día moto', unit: 'money' },
  { path: 'motorcycleDiscountPercent', label: 'Descuento de motos sobre automóvil', unit: 'percent' },
  { path: 'plateLimits.students', label: 'Límite de patentes: alumnos', unit: 'plates' },
  { path: 'plateLimits.teachers', label: 'Límite de patentes: docentes', unit: 'plates' },
  { path: 'plateLimits.staff', label: 'Límite de patentes: personal', unit: 'plates' },
  { path: 'totalCapacity', label: 'Capacidad total', unit: 'spaces' },
  { path: 'schedule.weekdays.open', label: 'Apertura lunes a viernes', unit: 'time' },
  { path: 'schedule.weekdays.close', label: 'Cierre lunes a viernes', unit: 'time' },
  { path: 'schedule.saturday.open', label: 'Apertura sábado', unit: 'time' },
  { path: 'schedule.saturday.close', label: 'Cierre sábado', unit: 'time' },
];

export interface SettingChange {
  label: string;
  from: string;
  to: string;
}

const integer: ValidatorFn = (control) =>
  control.value === null || control.value === '' || Number.isInteger(control.value) ? null : { integer: true };

/** Que el cierre sea posterior a la apertura. */
const closesAfterOpening: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const open = group.get('open')?.value as string;
  const close = group.get('close')?.value as string;
  return open && close && close <= open ? { schedule: true } : null;
};

const valueAt = (source: object, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], source);

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AsyncStateComponent, ModalComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private readonly service = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly currency = new CurrencyArPipe();
  private readonly fb = inject(FormBuilder);

  private readonly money = (max = 9_999_999) => [Validators.required, Validators.min(1), Validators.max(max)];
  private readonly count = (min: number, max: number) => [Validators.required, integer, Validators.min(min), Validators.max(max)];

  protected readonly form = this.fb.group({
    registeredDailyRate: this.fb.control<number | null>(null, this.money()),
    visitorDailyRate: this.fb.control<number | null>(null, this.money()),
    motorcycleDailyRate: this.fb.control<number | null>(null, this.money()),
    motorcycleDiscountPercent: this.fb.control<number | null>(null, [Validators.required, integer, Validators.min(0), Validators.max(100)]),
    plateLimits: this.fb.group({
      students: this.fb.control<number | null>(null, this.count(1, 10)),
      teachers: this.fb.control<number | null>(null, this.count(1, 10)),
      staff: this.fb.control<number | null>(null, this.count(1, 10)),
    }),
    totalCapacity: this.fb.control<number | null>(null, this.count(1, 100_000)),
    schedule: this.fb.group({
      weekdays: this.fb.nonNullable.group({ open: ['', Validators.required], close: ['', Validators.required] }, { validators: closesAfterOpening }),
      saturday: this.fb.nonNullable.group({ open: ['', Validators.required], close: ['', Validators.required] }, { validators: closesAfterOpening }),
    }),
  });

  protected readonly status = signal<AsyncStatus>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly confirming = signal(false);
  private readonly saved = signal<SystemSettings | null>(null);

  private readonly value = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  /** Diferencias entre lo que se está editando y lo último guardado. */
  protected readonly changes = computed<SettingChange[]>(() => {
    const baseline = this.saved();
    const current = this.value();
    if (!baseline) {
      return [];
    }
    return FIELDS.filter((field) => valueAt(baseline, field.path) !== valueAt(current, field.path)).map((field) => ({
      label: field.label,
      from: this.format(valueAt(baseline, field.path), field.unit),
      to: this.format(valueAt(current, field.path), field.unit),
    }));
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.status.set('loading');
    this.error.set(null);
    try {
      this.apply(await firstValueFrom(this.service.get()));
      this.status.set('success');
    } catch (error) {
      this.error.set(toErrorMessage(error));
      this.status.set('error');
    }
  }

  /** Mensaje de error de un campo, solo después de tocarlo o de intentar guardar. */
  protected errorOf(path: string): string | null {
    const control = this.form.get(path);
    if (!control || !control.errors || !(control.touched || this.submitted())) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Completá este campo.';
    }
    if (control.hasError('integer')) {
      return 'Ingresá un número entero.';
    }
    if (control.hasError('min')) {
      return `El mínimo es ${control.getError('min').min}.`;
    }
    if (control.hasError('max')) {
      return `El máximo es ${control.getError('max').max}.`;
    }
    return 'Valor inválido.';
  }

  protected scheduleError(path: 'schedule.weekdays' | 'schedule.saturday'): string | null {
    const group = this.form.get(path) as FormGroup;
    return group.hasError('schedule') && (group.touched || this.submitted())
      ? 'El cierre debe ser posterior a la apertura.'
      : null;
  }

  protected discard(): void {
    const baseline = this.saved();
    if (baseline) {
      this.apply(baseline);
    }
  }

  /** Valida y, si está todo bien, pide la confirmación antes de guardar. */
  protected requestSave(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.changes().length === 0) {
      return;
    }
    this.confirming.set(true);
  }

  protected cancelSave(): void {
    if (!this.saving()) {
      this.confirming.set(false);
    }
  }

  protected async confirmSave(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const stored = await firstValueFrom(this.service.save(this.form.getRawValue() as SystemSettings));
      this.apply(stored);
      this.confirming.set(false);
      this.toast.success('Configuración guardada correctamente.');
    } catch (error) {
      this.confirming.set(false);
      this.toast.error(toErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private apply(settings: SystemSettings): void {
    this.saved.set(settings);
    this.form.reset(settings);
    this.submitted.set(false);
  }

  private format(value: unknown, unit: Unit): string {
    switch (unit) {
      case 'money':
        return this.currency.transform(value as number);
      case 'percent':
        return `${value}%`;
      case 'plates':
        return `${value} pat.`;
      case 'spaces':
        return `${value} esp.`;
      default:
        return String(value);
    }
  }
}

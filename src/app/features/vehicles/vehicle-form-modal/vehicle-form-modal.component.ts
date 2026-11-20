import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminVehicle,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  VehicleStatus,
  VehicleType,
  VehicleUpsertRequest,
} from '../../../core/models/vehicle.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { formatPlate, normalizePlate, plateValidator } from '../../../shared/utils/plate';

/** Registro (vehicle = null) y edición de una patente. */
@Component({
  selector: 'app-vehicle-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './vehicle-form-modal.component.html',
  styleUrl: './vehicle-form-modal.component.scss',
})
export class VehicleFormModalComponent {
  readonly open = input.required<boolean>();
  readonly vehicle = input<AdminVehicle | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly saved = output<VehicleUpsertRequest>();
  readonly closed = output<void>();

  protected readonly types = Object.entries(VEHICLE_TYPE_LABELS) as [VehicleType, string][];
  protected readonly statuses = Object.entries(VEHICLE_STATUS_LABELS) as [VehicleStatus, string][];
  protected readonly submitted = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    plate: ['', [Validators.required, plateValidator]],
    ownerEmail: ['', [Validators.required, Validators.email]],
    type: ['CAR' as VehicleType, Validators.required],
    status: ['ACTIVE' as VehicleStatus, Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const vehicle = this.vehicle();
      this.submitted.set(false);
      this.form.reset({
        plate: vehicle ? formatPlate(vehicle.plate) : '',
        ownerEmail: vehicle?.ownerEmail ?? '',
        type: vehicle?.type ?? 'CAR',
        status: vehicle?.status ?? 'ACTIVE',
      });
    });
  }

  protected get isEdit(): boolean {
    return this.vehicle() !== null;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    this.saved.emit({
      plate: normalizePlate(value.plate),
      ownerEmail: value.ownerEmail.trim().toLowerCase(),
      type: value.type,
      status: value.status,
    });
  }
}

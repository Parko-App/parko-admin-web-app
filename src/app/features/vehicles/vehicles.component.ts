import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { toErrorMessage } from '../../core/http/error-message';
import {
  AdminVehicle,
  VEHICLE_STATUS_LABELS,
  VehicleStatus,
  VehicleUpsertRequest,
} from '../../core/models/vehicle.model';
import { ToastService } from '../../core/notifications/toast.service';
import { AsyncStateComponent } from '../../shared/components/async-state/async-state.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { BadgeVariant, StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { DateTimeArPipe } from '../../shared/pipes/date-time-ar.pipe';
import { PlatePipe } from '../../shared/pipes/plate.pipe';
import { PagedList } from '../../shared/utils/paged-list';
import { formatPlate } from '../../shared/utils/plate';
import { VehicleFormModalComponent } from './vehicle-form-modal/vehicle-form-modal.component';
import { VehiclesService } from './vehicles.service';

const PAGE_SIZE = 10;
const STATUS_VARIANTS: Record<VehicleStatus, BadgeVariant> = { ACTIVE: 'success', INACTIVE: 'neutral' };

@Component({
  selector: 'app-vehicles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    AsyncStateComponent,
    ConfirmDialogComponent,
    PaginationComponent,
    SortHeaderComponent,
    StatusBadgeComponent,
    DateTimeArPipe,
    PlatePipe,
    VehicleFormModalComponent,
  ],
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.scss',
})
export class VehiclesComponent {
  private readonly service = inject(VehiclesService);
  private readonly toast = inject(ToastService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly list = new PagedList<AdminVehicle>((query) => this.service.list(query), PAGE_SIZE);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<AdminVehicle | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly deleting = signal<AdminVehicle | null>(null);
  protected readonly deleteMessage = computed(() => {
    const vehicle = this.deleting();
    return vehicle
      ? `¿Está seguro de que desea dar de baja la patente ${formatPlate(vehicle.plate)} de ${vehicle.ownerName}? La patente quedará inactiva y se liberará para otro vehículo.`
      : '';
  });

  constructor() {
    this.list.bindSearch(this.searchControl);
  }

  protected statusLabel(status: VehicleStatus): string { return VEHICLE_STATUS_LABELS[status]; }
  protected statusVariant(status: VehicleStatus): BadgeVariant { return STATUS_VARIANTS[status]; }

  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(vehicle: AdminVehicle): void {
    this.editing.set(vehicle);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
    }
  }

  protected async save(request: VehicleUpsertRequest): Promise<void> {
    const editing = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    try {
      await firstValueFrom(editing ? this.service.update(editing.id, request) : this.service.create(request));
      this.formOpen.set(false);
      this.toast.success(editing ? 'Patente actualizada correctamente.' : 'Patente registrada correctamente.');
      this.list.reload();
    } catch (error) {
      this.formError.set(this.saveErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected askDelete(vehicle: AdminVehicle): void {
    this.deleting.set(vehicle);
  }

  protected cancelDelete(): void {
    this.deleting.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const vehicle = this.deleting();
    if (!vehicle) {
      return;
    }
    try {
      await firstValueFrom(this.service.delete(vehicle.id));
      this.deleting.set(null);
      this.toast.success(`Se dio de baja la patente ${formatPlate(vehicle.plate)}.`);
      this.list.reload();
    } catch (error) {
      this.deleting.set(null);
      this.toast.error(toErrorMessage(error));
    }
  }

  /** Prioriza el mensaje del backend (por ejemplo, "límite de patentes alcanzado"). */
  private saveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const body = error.error as { message?: unknown } | null;
      return typeof body?.message === 'string' ? body.message : 'Esa patente ya está registrada.';
    }
    return toErrorMessage(error);
  }
}

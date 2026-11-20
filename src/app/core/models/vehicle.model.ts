/**
 * Contrato SUPUESTO de vehículos (pendiente de confirmar con backend).
 * Endpoints: GET/POST /api/v1/admin/vehicles y PUT/DELETE /api/v1/admin/vehicles/{id}
 */
export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'PICKUP';
export type VehicleStatus = 'ACTIVE' | 'SUSPENDED';

export interface AdminVehicle {
  id: string;
  /** Normalizada: mayúsculas y sin espacios (AB123CD). */
  plate: string;
  ownerName: string;
  ownerEmail: string;
  type: VehicleType;
  status: VehicleStatus;
  /** Fecha ISO 8601 de registro. */
  registeredAt: string;
}

export interface VehicleUpsertRequest {
  plate: string;
  ownerEmail: string;
  type: VehicleType;
  status: VehicleStatus;
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  CAR: 'Automóvil',
  MOTORCYCLE: 'Moto',
  PICKUP: 'Camioneta',
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
};

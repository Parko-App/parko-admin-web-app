/**
 * Vehículos (admin-service): GET/POST admin/vehicles, GET/PATCH/DELETE admin/vehicles/{id}.
 * La baja es lógica: el backend libera la patente agregándole un sufijo "#id".
 */
export type VehicleStatus = 'ACTIVE' | 'INACTIVE';

export interface AdminVehicle {
  id: string;
  /** Normalizada: mayúsculas y sin espacios (AB123CD). */
  plate: string;
  userId: string;
  ownerName: string;
  ownerEmail: string;
  brand: string;
  model: string;
  status: VehicleStatus;
  /** Fecha ISO 8601 de registro. */
  registeredAt: string;
}

export interface VehicleUpsertRequest {
  plate: string;
  ownerEmail: string;
  brand: string;
  model: string;
  status: VehicleStatus;
}

/** Marca y modelo: máximo de caracteres que acepta el backend. */
export const VEHICLE_TEXT_MAX_LENGTH = 15;

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
};

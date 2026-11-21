/**
 * Usuarios (admin-service): GET/POST admin/users, GET/PATCH/DELETE admin/users/{id}.
 * El tipo es el rol del backend. La baja es lógica (active = false).
 */
import { SortState } from './sort.model';

export type UserType = 'STUDENT' | 'STAFF' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  type: UserType;
  /** Legajo (se deriva del correo). */
  studentId: string | null;
  /** null si no se pudo consultar el detalle del usuario. */
  balance: number | null;
  vehicleCount: number | null;
  status: UserStatus;
}

export interface UserUpsertRequest {
  fullName: string;
  email: string;
  type: UserType;
  status: UserStatus;
  /** Solo en el alta: contraseña inicial (la política la valida el backend). */
  password?: string;
}

export interface UserListQuery {
  search: string;
  page: number;
  size: number;
  sort: SortState | null;
}

export const USER_TYPE_LABELS: Record<UserType, string> = {
  STUDENT: 'Alumno',
  STAFF: 'Personal',
  ADMIN: 'Administrador',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

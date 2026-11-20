/**
 * Contrato SUPUESTO de usuarios (pendiente de confirmar con backend).
 * Endpoints: GET/POST /api/v1/admin/users y PUT/DELETE /api/v1/admin/users/{id}
 */
import { SortState } from './sort.model';

export type UserType = 'STUDENT' | 'TEACHER' | 'STAFF';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  type: UserType;
  balance: number;
  vehicleCount: number;
  status: UserStatus;
}

export interface UserUpsertRequest {
  fullName: string;
  email: string;
  type: UserType;
  status: UserStatus;
  balance: number;
}

export interface UserListQuery {
  search: string;
  page: number;
  size: number;
  sort: SortState | null;
}

export const USER_TYPE_LABELS: Record<UserType, string> = {
  STUDENT: 'Alumno',
  TEACHER: 'Docente',
  STAFF: 'Personal',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  INACTIVE: 'Inactivo',
};

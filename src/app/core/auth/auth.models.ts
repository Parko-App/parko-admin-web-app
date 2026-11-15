/** Usuario administrador con la sesión iniciada. */
export interface AuthUser {
  uid: string;
  email: string;
  nombre: string;
  rol: 'ADMIN';
}

/** Respuesta de GET /api/v1/user/{firebaseUid} (identity-service). */
export interface UserResponse {
  id: string;
  studentId: string | null;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN' | 'VISITOR';
  active: boolean;
}

export type AuthErrorCode = 'NOT_ADMIN' | 'INACTIVE';

/** Error de negocio del inicio de sesión (la cuenta existe pero no puede usar el panel). */
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
  }
}

/**
 * Alta de administrador con código de invitación.
 * CONTRATO SUPUESTO (pendiente de confirmar con backend): POST /api/v1/admin/register
 */
export interface RegisterAdminRequest {
  fullName: string;
  email: string;
  password: string;
  invitationCode: string;
}

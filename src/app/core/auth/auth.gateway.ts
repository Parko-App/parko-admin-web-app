/**
 * Acceso al proveedor de identidad (Firebase Auth). Aislado en una clase abstracta
 * para poder reemplazarlo por un mock en desarrollo y en los tests.
 */
export abstract class AuthGateway {
  /** Inicia sesión con email y contraseña. Devuelve el uid de Firebase. */
  abstract signIn(email: string, password: string): Promise<string>;
  /** Cierra la sesión del proveedor. */
  abstract signOut(): Promise<void>;
  /** Uid de la sesión guardada (si el navegador todavía tiene una), o null. */
  abstract restore(): Promise<string | null>;
  /** ID token vigente (el proveedor lo renueva solo), o null si no hay sesión. */
  abstract idToken(): Promise<string | null>;
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminProfileApi } from './admin-profile.api';
import { AuthGateway } from './auth.gateway';
import { AuthError, AuthUser } from './auth.models';

/**
 * Sesión del administrador. La identidad la da Firebase Auth; el rol se valida con
 * el perfil de identity-service. PROVISORIO: esta validación es solo una barrera de
 * interfaz; la seguridad real debe verificar el rol ADMIN en el backend del módulo admin.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly gateway = inject(AuthGateway);
  private readonly profiles = inject(AdminProfileApi);

  private readonly _user = signal<AuthUser | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /** Se ejecuta una vez al iniciar la app: recupera la sesión guardada, si existe. */
  async restoreSession(): Promise<void> {
    try {
      const uid = await this.gateway.restore();
      if (uid) {
        this._user.set(await this.loadAdmin(uid));
      }
    } catch (error) {
      this._user.set(null);
      if (error instanceof AuthError) {
        await this.gateway.signOut().catch(() => undefined);
      }
    }
  }

  async login(email: string, password: string): Promise<void> {
    const uid = await this.gateway.signIn(email.trim(), password);
    try {
      this._user.set(await this.loadAdmin(uid));
    } catch (error) {
      await this.gateway.signOut().catch(() => undefined);
      throw error;
    }
  }

  async logout(): Promise<void> {
    this._user.set(null);
    await this.gateway.signOut().catch(() => undefined);
  }

  private async loadAdmin(uid: string): Promise<AuthUser> {
    const profile = await firstValueFrom(this.profiles.getByUid(uid));
    if (profile.role !== 'ADMIN') {
      throw new AuthError('NOT_ADMIN');
    }
    if (!profile.active) {
      throw new AuthError('INACTIVE');
    }
    return { uid, email: profile.email, nombre: profile.fullName, rol: 'ADMIN' };
  }
}

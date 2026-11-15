import { AuthGateway } from './auth.gateway';

interface MockAccount {
  uid: string;
  password: string;
}

/** Cuentas de demostración (solo con useMocks: true). */
export const MOCK_ACCOUNTS: Record<string, MockAccount> = {
  'admin@parko.site': { uid: 'mock-admin', password: 'Admin1234!' },
  'alumno@parko.site': { uid: 'mock-student', password: 'Alumno1234!' },
};

const STORAGE_KEY = 'parko-mock-session';

/** Imita a Firebase Auth sin red: la sesión se guarda en sessionStorage. */
export class MockAuthGateway extends AuthGateway {
  private uid: string | null = this.read();

  async signIn(email: string, password: string): Promise<string> {
    const account = MOCK_ACCOUNTS[email.trim().toLowerCase()];
    if (!account || account.password !== password) {
      throw Object.assign(new Error('invalid credential'), { code: 'auth/invalid-credential' });
    }
    this.uid = account.uid;
    this.write(account.uid);
    return account.uid;
  }

  async signOut(): Promise<void> {
    this.uid = null;
    this.write(null);
  }

  async restore(): Promise<string | null> {
    return this.uid;
  }

  async idToken(): Promise<string | null> {
    return this.uid ? `mock-token-${this.uid}` : null;
  }

  private read(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private write(uid: string | null): void {
    try {
      if (uid) {
        sessionStorage.setItem(STORAGE_KEY, uid);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* sin storage: la sesión vive solo en memoria */
    }
  }
}

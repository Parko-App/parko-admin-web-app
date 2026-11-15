import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FirebaseWebConfig } from '../config/tokens';
import { AuthGateway } from './auth.gateway';

export class FirebaseAuthGateway extends AuthGateway {
  private readonly app: FirebaseApp;
  private readonly auth: Auth;

  constructor(config: FirebaseWebConfig) {
    super();
    this.app = initializeApp(config);
    this.auth = getAuth(this.app); // persistencia por defecto: IndexedDB (sobrevive a recargas)
  }

  async signIn(email: string, password: string): Promise<string> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return credential.user.uid;
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }

  async restore(): Promise<string | null> {
    await this.auth.authStateReady();
    return this.auth.currentUser?.uid ?? null;
  }

  async idToken(): Promise<string | null> {
    return (await this.auth.currentUser?.getIdToken()) ?? null;
  }
}

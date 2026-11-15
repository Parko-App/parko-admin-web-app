import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { routes } from '../../app.routes';
import { ApiClient } from '../services/api-client.service';
import { authInterceptor } from '../http/auth.interceptor';
import { authErrorMessage } from './auth-error-message';
import { AuthError } from './auth.models';
import { AuthService } from './auth.service';
import { MOCK_AUTH_PROVIDERS } from './auth.providers';
import { AuthGateway } from './auth.gateway';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      ...MOCK_AUTH_PROVIDERS,
    ],
  });
  return TestBed.inject(AuthService);
}

describe('AuthService', () => {
  beforeEach(() => sessionStorage.clear());

  it('inicia sesión con un administrador', async () => {
    const auth = setup();
    await auth.login('admin@parko.site', 'Admin1234!');
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.nombre).toBe('María Acosta');
  });

  it('rechaza una cuenta que no es ADMIN y no deja sesión', async () => {
    const auth = setup();
    await expect(auth.login('alumno@parko.site', 'Alumno1234!')).rejects.toBeInstanceOf(AuthError);
    expect(auth.isAuthenticated()).toBe(false);
    expect(await TestBed.inject(AuthGateway).restore()).toBeNull();
  });

  it('rechaza credenciales inválidas', async () => {
    const auth = setup();
    await expect(auth.login('admin@parko.site', 'mala')).rejects.toMatchObject({ code: 'auth/invalid-credential' });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('cierra la sesión', async () => {
    const auth = setup();
    await auth.login('admin@parko.site', 'Admin1234!');
    await auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('recupera la sesión guardada', async () => {
    const first = setup();
    await first.login('admin@parko.site', 'Admin1234!');
    TestBed.resetTestingModule();
    const second = setup();
    await second.restoreSession();
    expect(second.isAuthenticated()).toBe(true);
  });
});

describe('authErrorMessage', () => {
  it('traduce los errores de Firebase y de negocio', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe('Email o contraseña incorrectos.');
    expect(authErrorMessage({ code: 'auth/too-many-requests' })).toContain('Demasiados intentos');
    expect(authErrorMessage(new AuthError('NOT_ADMIN'))).toContain('permisos de administrador');
    expect(authErrorMessage(new HttpErrorResponse({ status: 404 }))).toContain('perfil');
    expect(authErrorMessage(new Error('x'))).toContain('No se pudo iniciar sesión');
  });
});

describe('guards', () => {
  beforeEach(() => sessionStorage.clear());

  it('redirige a /login con returnUrl si no hay sesión', async () => {
    setup();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/pagos');
    expect(router.url).toBe('/login?returnUrl=%2Fadmin%2Fpagos');
  });

  it('deja entrar al panel con sesión y saca al usuario de /login', async () => {
    const auth = setup();
    await auth.login('admin@parko.site', 'Admin1234!');
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/pagos');
    expect(router.url).toBe('/admin/pagos');
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/admin/dashboard');
  });
});

describe('authInterceptor', () => {
  beforeEach(() => sessionStorage.clear());

  it('agrega el token a la API propia y no a otros orígenes', async () => {
    const auth = setup();
    await auth.login('admin@parko.site', 'Admin1234!');
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(ApiClient);

    void firstValueFrom(api.get('ping'));
    await tick();
    const own = http.expectOne((r) => r.url.endsWith('/ping'));
    expect(own.request.headers.get('Authorization')).toBe('Bearer mock-token-mock-admin');
    own.flush({});

    void firstValueFrom(TestBed.inject(HttpClient).get('https://otro.com/x'));
    await tick();
    const other = http.expectOne('https://otro.com/x');
    expect(other.request.headers.has('Authorization')).toBe(false);
    other.flush({});
  });

  it('ante un 401 cierra la sesión y vuelve al login', async () => {
    const auth = setup();
    await auth.login('admin@parko.site', 'Admin1234!');
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);

    const result = firstValueFrom(TestBed.inject(ApiClient).get('privado')).catch((e) => e);
    await tick();
    http.expectOne((r) => r.url.endsWith('/privado')).flush({}, { status: 401, statusText: 'Unauthorized' });
    await result;
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(auth.isAuthenticated()).toBe(false);
    expect(router.url).toContain('/login');
    expect(router.url).toContain('reason=expired');
  });
});

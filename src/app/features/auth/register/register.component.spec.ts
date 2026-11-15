import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/auth/auth.service';
import { MOCK_AUTH_PROVIDERS } from '../../../core/auth/auth.providers';
import { MOCK_ACCOUNTS } from '../../../core/auth/mock-auth.gateway';
import { passwordRulesValidator } from '../../../shared/utils/password-rules';
import { RegisterComponent } from './register.component';
import { FormControl } from '@angular/forms';

function setup() {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    imports: [RegisterComponent],
    providers: [provideRouter(routes), provideHttpClient(), ...MOCK_AUTH_PROVIDERS],
  });
  const fixture = TestBed.createComponent(RegisterComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, router: TestBed.inject(Router) };
}

function type(el: HTMLElement, id: string, value: string) {
  const input = el.querySelector(`#${id}`) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function fillAll(el: HTMLElement, overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    fullName: 'Lucas Perazolo',
    email: 'nuevo@parko.site',
    password: 'Clave-Segura1',
    confirmPassword: 'Clave-Segura1',
    invitationCode: 'PARKO-2026',
    ...overrides,
  };
  Object.entries(values).forEach(([id, value]) => type(el, id, value));
}

async function submit(fixture: { whenStable(): Promise<unknown>; detectChanges(): void }, el: HTMLElement) {
  (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('passwordRulesValidator', () => {
  it('exige las mismas reglas que el backend', () => {
    expect(passwordRulesValidator(new FormControl('corta'))).not.toBeNull();
    expect(passwordRulesValidator(new FormControl('sinmayuscula1!'))).toEqual({ passwordRules: ['upper'] });
    expect(passwordRulesValidator(new FormControl('Clave-Segura1'))).toBeNull();
  });
});

describe('RegisterComponent', () => {
  it('valida los campos obligatorios', async () => {
    const { fixture, el } = setup();
    await submit(fixture, el);
    expect(el.textContent).toContain('Ingresá tu nombre completo.');
    expect(el.textContent).toContain('Ingresá tu email.');
    expect(el.textContent).toContain('Ingresá el código de invitación.');
  });

  it('marca las reglas de contraseña a medida que se cumplen', () => {
    const { fixture, el } = setup();
    type(el, 'password', 'Clave-Segura1');
    fixture.detectChanges();
    expect(el.querySelectorAll('.rules__ok').length).toBe(5);
  });

  it('detecta contraseñas que no coinciden', async () => {
    const { fixture, el } = setup();
    fillAll(el, { confirmPassword: 'Otra-Clave99' });
    await submit(fixture, el);
    expect(el.textContent).toContain('Las contraseñas no coinciden.');
  });

  it('rechaza un código de invitación inválido', async () => {
    const { fixture, el } = setup();
    fillAll(el, { invitationCode: 'MALO' });
    await submit(fixture, el);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('código de invitación');
  });

  it('rechaza un email ya registrado', async () => {
    const { fixture, el } = setup();
    fillAll(el, { email: 'admin@parko.site' });
    await submit(fixture, el);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Ya existe una cuenta con ese email.');
  });

  it('crea la cuenta, vuelve al login y permite iniciar sesión', async () => {
    const { fixture, el, router } = setup();
    fillAll(el, { email: 'registro-ok@parko.site' });
    await submit(fixture, el);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(router.url).toBe('/login?registered=1');
    expect(MOCK_ACCOUNTS['registro-ok@parko.site']).toBeDefined();

    const auth = TestBed.inject(AuthService);
    await auth.login('registro-ok@parko.site', 'Clave-Segura1');
    expect(auth.user()?.nombre).toBe('Lucas Perazolo');
  });
});

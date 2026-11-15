import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from '../../../app.routes';
import { MOCK_AUTH_PROVIDERS } from '../../../core/auth/auth.providers';
import { LoginComponent } from './login.component';
import { provideHttpClient } from '@angular/common/http';

async function setup() {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [provideRouter(routes), provideHttpClient(), ...MOCK_AUTH_PROVIDERS],
  });
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, router: TestBed.inject(Router) };
}

function fill(el: HTMLElement, email: string, password: string) {
  const email$ = el.querySelector('#email') as HTMLInputElement;
  const pass$ = el.querySelector('#password') as HTMLInputElement;
  email$.value = email;
  email$.dispatchEvent(new Event('input'));
  pass$.value = password;
  pass$.dispatchEvent(new Event('input'));
}

describe('LoginComponent', () => {
  it('valida los campos obligatorios', async () => {
    const { fixture, el } = await setup();
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Ingresá tu email.');
    expect(el.textContent).toContain('Ingresá tu contraseña.');
  });

  it('muestra un error con credenciales incorrectas', async () => {
    const { fixture, el } = await setup();
    fill(el, 'admin@parko.site', 'incorrecta');
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Email o contraseña incorrectos.');
  });

  it('muestra que la cuenta no es de administrador', async () => {
    const { fixture, el } = await setup();
    fill(el, 'alumno@parko.site', 'Alumno1234!');
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('permisos de administrador');
  });

  it('con un admin entra al dashboard', async () => {
    const { fixture, el, router } = await setup();
    fill(el, 'admin@parko.site', 'Admin1234!');
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(router.url).toBe('/admin/dashboard');
  });

  it('muestra y oculta la contraseña', async () => {
    const { fixture, el } = await setup();
    const input = el.querySelector('#password') as HTMLInputElement;
    expect(input.type).toBe('password');
    (el.querySelector('.field__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
  });
});

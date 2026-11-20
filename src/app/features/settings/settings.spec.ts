import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { SystemSettings } from '../../core/models/settings.model';
import { ToastService } from '../../core/notifications/toast.service';
import { SettingsComponent } from './settings.component';
import { MockSettingsService, SettingsService } from './settings.service';

registerLocaleData(localeEsAr, 'es-AR');

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup(service: SettingsService = new MockSettingsService()) {
  TestBed.configureTestingModule({
    imports: [SettingsComponent],
    providers: [{ provide: SettingsService, useValue: service }, { provide: LOCALE_ID, useValue: 'es-AR' }],
  });
  const fixture = TestBed.createComponent(SettingsComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async (ms = 10) => {
    await tick(ms);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();
  const input = (id: string) => el.querySelector(`#${id}`) as HTMLInputElement;
  const setValue = async (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    await settle();
  };
  const saveButton = () => el.querySelector('.actions__buttons .btn--primary') as HTMLButtonElement;
  const submit = async () => {
    (el.querySelector('form.settings') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
  };
  const dialog = () => el.querySelector('[role=dialog]');
  return { fixture, el, settle, input, setValue, saveButton, submit, dialog, toast: TestBed.inject(ToastService) };
}

describe('SettingsComponent', () => {
  it('muestra tarifas y parámetros cargados, sin los campos eliminados', async () => {
    const { el, input } = await setup();
    expect(input('registeredDailyRate').value).toBe('4500');
    expect(input('visitorDailyRate').value).toBe('6200');
    expect(input('motorcycleDailyRate').value).toBe('2250');
    expect(input('motorcycleDiscountPercent').value).toBe('50');
    expect(input('limitStudents').value).toBe('2');
    expect(input('limitTeachers').value).toBe('2');
    expect(input('limitStaff').value).toBe('3');
    expect(input('totalCapacity').value).toBe('247');
    expect(input('weekdaysOpen').value).toBe('06:00');
    expect(input('weekdaysClose').value).toBe('22:00');
    expect(input('saturdayOpen').value).toBe('07:00');
    expect(input('saturdayClose').value).toBe('14:00');
    const text = el.textContent!;
    expect(text).not.toContain('Tolerancia');
    expect(text).not.toContain('Alerta de ocupación');
    expect(text).not.toContain('sin movimiento');
    expect(text).toContain('Los cambios de tarifas y parámetros son auditados');
  });

  it('el botón guardar está deshabilitado hasta que hay cambios', async () => {
    const { saveButton, setValue } = await setup();
    expect(saveButton().disabled).toBe(true);
    await setValue('registeredDailyRate', '5000');
    expect(saveButton().disabled).toBe(false);
    await setValue('registeredDailyRate', '4500');
    expect(saveButton().disabled).toBe(true);
  });

  it('valida los campos y no pide confirmación si hay errores', async () => {
    const { el, setValue, submit, dialog } = await setup();
    await setValue('registeredDailyRate', '');
    await setValue('motorcycleDiscountPercent', '150');
    await setValue('limitStudents', '0');
    await setValue('totalCapacity', '12.5');
    await setValue('weekdaysClose', '05:00');
    await submit();
    expect(dialog()).toBeNull();
    const text = el.textContent!;
    expect(text).toContain('Completá este campo.');
    expect(text).toContain('El máximo es 100.');
    expect(text).toContain('El mínimo es 1.');
    expect(text).toContain('Ingresá un número entero.');
    expect(text).toContain('El cierre debe ser posterior a la apertura.');
    expect(el.querySelector('.actions__error')?.textContent).toContain('Revisá los campos marcados');
  });

  it('al guardar pide confirmación y muestra qué cambia', async () => {
    const { el, setValue, submit, dialog } = await setup();
    await setValue('registeredDailyRate', '5000');
    await setValue('limitStaff', '4');
    await setValue('saturdayClose', '15:00');
    await submit();
    const modal = dialog()!;
    expect(modal.textContent).toContain('Confirmar cambios');
    expect(modal.textContent).toContain('los siguientes 3 cambios');
    expect(modal.textContent).toContain('Costo por día (usuarios registrados)');
    expect(modal.textContent).toContain('$4.500');
    expect(modal.textContent).toContain('$5.000');
    expect(modal.textContent).toContain('3 pat.');
    expect(modal.textContent).toContain('4 pat.');
    expect(modal.textContent).toContain('14:00');
    expect(modal.textContent).toContain('15:00');
    expect(el.querySelectorAll('.confirm__list li').length).toBe(3);
  });

  it('cancelar la confirmación no guarda; confirmar guarda y actualiza el estado', async () => {
    const service = new MockSettingsService();
    let saved: SystemSettings | null = null;
    const original = service.save.bind(service);
    service.save = (settings: SystemSettings): Observable<SystemSettings> => {
      saved = settings;
      return original(settings);
    };
    const { el, setValue, submit, dialog, settle, saveButton, toast } = await setup(service);
    await setValue('totalCapacity', '250');
    await submit();
    (dialog()!.querySelectorAll('.btn')[0] as HTMLElement).click(); // Cancelar
    await settle();
    expect(dialog()).toBeNull();
    expect(saved).toBeNull();
    expect(saveButton().disabled).toBe(false);

    await submit();
    expect(dialog()!.textContent).toContain('el siguiente cambio');
    (dialog()!.querySelector('.btn--primary') as HTMLElement).click(); // Confirmar y guardar
    await settle(30);
    expect(dialog()).toBeNull();
    expect(saved).not.toBeNull();
    expect(saved!.totalCapacity).toBe(250);
    expect(saved!.registeredDailyRate).toBe(4500);
    expect(saved!.schedule.weekdays).toEqual({ open: '06:00', close: '22:00' });
    expect(toast.toasts()[0].message).toBe('Configuración guardada correctamente.');
    expect(saveButton().disabled).toBe(true); // lo guardado pasa a ser la nueva base
    expect(el.querySelector('#totalCapacity')).not.toBeNull();
  });

  it('descartar cambios vuelve a los valores guardados', async () => {
    const { el, input, setValue, settle } = await setup();
    await setValue('visitorDailyRate', '9999');
    (el.querySelectorAll('.actions__buttons .btn')[0] as HTMLElement).click();
    await settle();
    expect(input('visitorDailyRate').value).toBe('6200');
  });

  it('si el guardado falla informa el error y mantiene los cambios', async () => {
    const service = new MockSettingsService();
    service.save = () => throwError(() => new Error('boom'));
    const { setValue, submit, dialog, settle, saveButton, toast, input } = await setup(service);
    await setValue('totalCapacity', '300');
    await submit();
    (dialog()!.querySelector('.btn--primary') as HTMLElement).click();
    await settle(30);
    expect(toast.toasts()[0].message).toContain('error');
    expect(input('totalCapacity').value).toBe('300');
    expect(saveButton().disabled).toBe(false);
  });

  it('si la carga falla permite reintentar', async () => {
    let fail = true;
    const real = new MockSettingsService();
    const flaky: SettingsService = {
      get: () => (fail ? throwError(() => new Error('boom')) : real.get()),
      save: (settings) => of(settings),
    };
    const { el, settle } = await setup(flaky);
    expect(el.textContent).toContain('Ocurrió un error inesperado.');
    fail = false;
    (el.querySelector('app-error-state button') as HTMLElement).click();
    await settle();
    expect((el.querySelector('#registeredDailyRate') as HTMLInputElement).value).toBe('4500');
  });
});

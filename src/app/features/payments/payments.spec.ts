import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/notifications/toast.service';
import { PaymentsComponent } from './payments.component';
import { MOCK_SAMPLE_TICKETS, MockPaymentsService, PaymentsService } from './payments.service';

registerLocaleData(localeEsAr, 'es-AR');

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup() {
  TestBed.configureTestingModule({
    imports: [PaymentsComponent],
    providers: [{ provide: PaymentsService, useClass: MockPaymentsService }, { provide: LOCALE_ID, useValue: 'es-AR' }],
  });
  const fixture = TestBed.createComponent(PaymentsComponent);
  fixture.detectChanges();
  await tick();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async (ms = 10) => {
    await tick(ms);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const click = (selector: string, index = 0) => (el.querySelectorAll(selector)[index] as HTMLElement).click();
  const search = async (code: string) => {
    const input = el.querySelector('#ticket-code') as HTMLInputElement;
    input.value = code;
    input.dispatchEvent(new Event('input'));
    (el.querySelector('form.search') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
  };
  const tickets = () => Array.from(el.querySelectorAll('.payments tbody tr .mono:first-child')).map((td) => td.textContent?.trim());
  return { fixture, el, settle, click, search, tickets, toast: TestBed.inject(ToastService) };
}

describe('PaymentsComponent', () => {
  it('titula la tarjeta de búsqueda solo "Buscar ticket"', async () => {
    const { el } = await setup();
    expect(el.querySelector('#search-title')?.textContent?.trim()).toBe('Buscar ticket');
  });

  it('lista los cobros de hoy con total y cantidad', async () => {
    const { el } = await setup();
    const rows = el.querySelectorAll('.payments tbody tr');
    expect(rows.length).toBe(5);
    expect(rows[0].textContent).toContain('10:47');
    expect(rows[0].textContent).toContain('$2.560');
    expect(rows[0].textContent).toContain('Efectivo');
    expect(rows[0].textContent).toContain('M. Acosta');
    expect(el.querySelector('.summary')?.textContent).toContain('5 cobros registrados');
    expect(el.querySelector('.summary')?.textContent).toContain('Total: $8.640');
  });

  it('ordena la tabla por monto y por ticket', async () => {
    const { el, click, settle } = await setup();
    const amounts = () => Array.from(el.querySelectorAll('.payments .amount')).map((td) => td.textContent?.trim());
    click('th[appSortHeader="amount"] button');
    await settle();
    expect(amounts()).toEqual(['$760', '$980', '$1.240', '$2.560', '$3.100']);
    click('th[appSortHeader="amount"] button');
    await settle();
    expect(amounts()[0]).toBe('$3.100');
    expect(el.querySelector('th[appSortHeader="amount"]')?.getAttribute('aria-sort')).toBe('descending');
    click('th[appSortHeader="ticketNumber"] button');
    await settle();
    expect(el.querySelector('.payments tbody tr')?.textContent).toContain('-0012');
  });

  it('pide el dato si se busca vacío', async () => {
    const { el, search } = await setup();
    await search('  ');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Ingresá el número de ticket');
  });

  it('informa cuando el ticket no existe', async () => {
    const { el, search } = await setup();
    await search('TKT-00000000-9999');
    expect(el.querySelector('[role=alert]')?.textContent).toContain('No se encontró ningún ticket');
  });

  it('encuentra un ticket pendiente (sin importar mayúsculas) y muestra el detalle', async () => {
    const { el, search } = await setup();
    await search(MOCK_SAMPLE_TICKETS[1].toLowerCase());
    const result = el.querySelector('.result')!;
    expect(result.textContent).toContain(MOCK_SAMPLE_TICKETS[1]);
    expect(result.textContent).toContain('Pendiente de cobro');
    expect(result.textContent).toContain('$1.500');
    expect(result.textContent).toContain('KL 321 MN');
    expect(result.textContent).toContain('Usuario registrado');
    expect(result.textContent).toContain('Registrar cobro en efectivo');
  });

  it('registra el cobro tras confirmar y actualiza la tabla', async () => {
    const { el, search, click, settle, toast, tickets } = await setup();
    await search(MOCK_SAMPLE_TICKETS[0]);
    click('.result .btn--primary');
    await settle();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain(`${MOCK_SAMPLE_TICKETS[0]}`);
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('$3.000');
    // el botón de confirmar del diálogo
    (el.querySelectorAll('[role=dialog] .btn--primary')[0] as HTMLElement).click();
    await settle(30);
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(toast.toasts()[0].message).toContain('Cobro registrado');
    expect(tickets().length).toBe(6);
    expect(el.querySelector('.summary')?.textContent).toContain('6 cobros registrados');
    expect(el.querySelector('.summary')?.textContent).toContain('Total: $11.640');
    expect(el.querySelector('.result')?.textContent).toContain('Cobrado');
    expect(el.querySelector('.result .btn--primary')).toBeNull();
  });

  it('un ticket ya cobrado no ofrece cobrar de nuevo', async () => {
    const { el, search } = await setup();
    await search(MOCK_SAMPLE_TICKETS[0].replace('0042', '0031'));
    expect(el.querySelector('.result')?.textContent).toContain('Este ticket ya fue cobrado.');
    expect(el.querySelector('.result .btn--primary')).toBeNull();
  });

  describe('registrar pago manual', () => {
    const fill = (el: HTMLElement, values: Record<string, string>) => {
      for (const [id, value] of Object.entries(values)) {
        const input = el.querySelector(`#${id}`) as HTMLInputElement;
        input.value = value;
        input.dispatchEvent(new Event('input'));
      }
    };
    const submit = async (el: HTMLElement, settle: (ms?: number) => Promise<void>) => {
      (el.querySelector('#payment-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await settle(30);
    };

    it('abre el formulario desde el botón "Registrar pago"', async () => {
      const { el, click, settle } = await setup();
      click('.panel__head .btn--primary');
      await settle();
      const dialog = el.querySelector('[role=dialog]')!;
      expect(dialog.textContent).toContain('Registrar pago');
      expect(dialog.querySelector('#pay-ticket')).not.toBeNull();
      expect(dialog.querySelector('#pay-amount')).not.toBeNull();
      expect(dialog.querySelector('#pay-received')).toBeNull();
      expect(dialog.querySelector('#pay-notes')).toBeNull();
    });

    it('valida ticket y monto', async () => {
      const { el, click, settle } = await setup();
      click('.panel__head .btn--primary');
      await settle();
      await submit(el, settle);
      expect(el.textContent).toContain('Ingresá el número de ticket.');
      expect(el.textContent).toContain('Ingresá un monto mayor a cero.');
    });

    it('registra el pago y actualiza la tabla', async () => {
      const { el, click, settle, toast, tickets } = await setup();
      click('.panel__head .btn--primary');
      await settle();
      fill(el, { 'pay-ticket': MOCK_SAMPLE_TICKETS[0].toLowerCase(), 'pay-amount': '3000' });
      await submit(el, settle);
      expect(el.querySelector('[role=dialog]')).toBeNull();
      expect(toast.toasts()[0].message).toContain('Pago registrado: $3.000');
      expect(tickets().length).toBe(6);
      expect(el.querySelector('.summary')?.textContent).toContain('Total: $11.640');
    });

    it('muestra el error del backend dentro del formulario (monto distinto o ticket inexistente)', async () => {
      const { el, click, settle } = await setup();
      click('.panel__head .btn--primary');
      await settle();
      fill(el, { 'pay-ticket': MOCK_SAMPLE_TICKETS[0], 'pay-amount': '999' });
      await submit(el, settle);
      expect(el.querySelector('[role=alert]')?.textContent).toContain('no coincide con el total a cobrar');
      fill(el, { 'pay-ticket': 'TKT-00000000-9999' });
      await submit(el, settle);
      expect(el.querySelector('[role=alert]')?.textContent).toContain('No se encontró ningún ticket');
      expect(el.querySelector('[role=dialog]')).not.toBeNull();
    });

    it('rechaza cobrar dos veces el mismo ticket', async () => {
      const { el, click, settle } = await setup();
      for (const attempt of [1, 2]) {
        click('.panel__head .btn--primary');
        await settle();
        fill(el, { 'pay-ticket': MOCK_SAMPLE_TICKETS[1], 'pay-amount': '1500' });
        await submit(el, settle);
        if (attempt === 2) {
          expect(el.querySelector('[role=alert]')?.textContent).toContain('El ticket ya fue cobrado.');
        }
      }
    });
  });

  it('cada cobro tiene "Ver detalle" (comprobante en rojo) y "Generar PDF"', async () => {
    const { el, settle } = await setup();
    const row = el.querySelector('.payments tbody tr') as HTMLElement;
    const buttons = Array.from(row.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Ver detalle', 'Generar PDF']);
    (row.querySelector('button') as HTMLButtonElement).click();
    await settle();
    expect(el.querySelector('.receipt__title')?.textContent).toContain('Pago realizado');
    expect(el.querySelector('.receipt__amount--debit')?.textContent?.trim()).toBe('- $2.560');
  });
});

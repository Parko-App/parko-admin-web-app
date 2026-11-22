import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastService } from '../../core/notifications/toast.service';
import { ReceiptService } from '../../shared/receipt/receipt.service';
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

  it('lista todos los tickets, no solo los cobrados, con la cantidad total', async () => {
    const { el } = await setup();
    const rows = el.querySelectorAll('.payments tbody tr');
    expect(rows.length).toBe(9);
    expect(el.querySelector('.summary')?.textContent).toContain('9 tickets');
    const headers = Array.from(el.querySelectorAll('.payments thead th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Ticket', 'Emisión', 'Estado', 'Monto', 'Método', 'Cajero', 'Acciones']);
  });

  it('muestra el estado de cada ticket con su color', async () => {
    const { el } = await setup();
    const badge = (row: number) => el.querySelectorAll('.payments tbody tr')[row].querySelector('.badge')!;
    // más recientes primero: 0028, 0031, 0024, 0019, 0012, 0042, 0039, 0008, 0005
    expect(badge(0).textContent?.trim()).toBe('Cobrado');
    expect(badge(0).classList).toContain('badge--success');
    expect(badge(5).textContent?.trim()).toBe('Pendiente de cobro');
    expect(badge(5).classList).toContain('badge--warning');
    expect(badge(7).textContent?.trim()).toBe('Utilizado');
    expect(badge(7).classList).toContain('badge--info');
    expect(badge(8).textContent?.trim()).toBe('Cancelado');
    expect(badge(8).classList).toContain('badge--danger');
  });

  it('en los cobrados muestra el método, y el cajero solo cuando fue en efectivo', async () => {
    const { el } = await setup();
    const rows = el.querySelectorAll('.payments tbody tr');
    // 0028: Mercado Pago, sin cajero
    expect(rows[0].textContent).toContain('Mercado Pago');
    expect(rows[0].textContent).toContain('$980');
    expect(rows[0].querySelectorAll('td')[5].textContent?.trim()).toBe('—');
    // 0031: efectivo, cobrado por un administrador
    expect(rows[1].textContent).toContain('Efectivo');
    expect(rows[1].querySelectorAll('td')[5].textContent?.trim()).toBe('M. Acosta');
    // 0019: saldo de la app, sin cajero
    expect(rows[3].textContent).toContain('Saldo Parko');
    // los que no se cobraron no tienen método ni cajero
    expect(rows[5].querySelectorAll('td')[4].textContent?.trim()).toBe('—');
    expect(rows[5].querySelectorAll('td')[5].textContent?.trim()).toBe('—');
    expect(rows[8].querySelectorAll('td')[4].textContent?.trim()).toBe('—');
  });

  it('ordena la tabla por ticket y por estado', async () => {
    const { el, click, settle } = await setup();
    click('th[appSortHeader="ticketNumber"] button');
    await settle();
    expect(el.querySelector('.payments tbody tr')?.textContent).toContain('-0005');
    expect(el.querySelector('th[appSortHeader="ticketNumber"]')?.getAttribute('aria-sort')).toBe('ascending');
    click('th[appSortHeader="ticketNumber"] button');
    await settle();
    expect(el.querySelector('.payments tbody tr')?.textContent).toContain('-0042');

    click('th[appSortHeader="status"] button');
    await settle();
    expect(el.querySelector('.payments tbody tr .badge')?.textContent?.trim()).toBe('Cancelado');
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
    // el ticket ya estaba en la lista: ahora figura cobrado en efectivo
    expect(tickets().length).toBe(9);
    const paidRow = Array.from(el.querySelectorAll('.payments tbody tr')).find((r) => r.textContent?.includes('-0042'))!;
    expect(paidRow.querySelector('.badge')?.textContent?.trim()).toBe('Cobrado');
    expect(paidRow.textContent).toContain('Efectivo');
    expect(paidRow.textContent).toContain('M. Acosta');
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
      expect(tickets().length).toBe(9);
      const paidRow = Array.from(el.querySelectorAll('.payments tbody tr')).find((r) => r.textContent?.includes('-0042'))!;
      expect(paidRow.querySelector('.badge')?.textContent?.trim()).toBe('Cobrado');
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

  describe('generar ingreso y egreso por patente', () => {
    const open = async (click: (selector: string, index?: number) => void, settle: () => Promise<void>, which: 'ENTRY' | 'EXIT') => {
      click('.panel__actions .btn:not(.btn--primary)', which === 'ENTRY' ? 0 : 1);
      await settle();
    };
    const typePlate = (el: HTMLElement, plate: string) => {
      const input = el.querySelector('#plate-action-plate') as HTMLInputElement;
      input.value = plate;
      input.dispatchEvent(new Event('input'));
    };
    const submit = async (el: HTMLElement, settle: (ms?: number) => Promise<void>) => {
      (el.querySelector('#plate-action-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await settle(30);
    };
    const rowOf = (el: HTMLElement, ticket: string) =>
      Array.from(el.querySelectorAll('.payments tbody tr')).find((r) => r.textContent?.includes(ticket));
    const dialogText = (el: HTMLElement) => el.querySelector('[role=dialog]')?.textContent ?? '';

    /** Espía la descarga del PDF (no se genera el archivo real). */
    const spyDownload = () => vi.spyOn(TestBed.inject(ReceiptService), 'download').mockResolvedValue(true);

    it('la pantalla tiene los botones Generar ingreso, Generar egreso y Registrar pago', async () => {
      const { el } = await setup();
      const labels = Array.from(el.querySelectorAll('.panel__actions .btn')).map((b) => b.textContent?.trim());
      expect(labels).toEqual(['Generar ingreso', 'Generar egreso', 'Registrar pago']);
    });

    it('cada botón abre su diálogo', async () => {
      const { el, click, settle } = await setup();
      await open(click, settle, 'ENTRY');
      expect(dialogText(el)).toContain('Generar ingreso');
      expect(dialogText(el)).toContain('de visitante');
      (el.querySelector('[role=dialog] .btn:not(.btn--primary)') as HTMLButtonElement).click();
      await settle();
      expect(el.querySelector('[role=dialog]')).toBeNull();

      await open(click, settle, 'EXIT');
      expect(dialogText(el)).toContain('Generar egreso');
      expect(dialogText(el)).toContain('ya está pagado');
    });

    it('valida la patente antes de enviar', async () => {
      const { el, click, settle } = await setup();
      const entry = vi.spyOn(TestBed.inject(PaymentsService), 'generateEntry');
      await open(click, settle, 'ENTRY');

      await submit(el, settle);
      expect(dialogText(el)).toContain('Ingresá la patente.');

      typePlate(el, 'AB12');
      await submit(el, settle);
      expect(dialogText(el)).toContain('La patente no es válida');
      expect(entry).not.toHaveBeenCalled();
    });

    it('ingreso de una patente que no está registrada: genera un visitante y lo muestra en la lista', async () => {
      const { el, click, settle, toast, tickets } = await setup();
      spyDownload();
      const entry = vi.spyOn(TestBed.inject(PaymentsService), 'generateEntry');
      await open(click, settle, 'ENTRY');

      typePlate(el, 'zz 999-xx');
      await submit(el, settle);

      expect(entry).toHaveBeenCalledWith('ZZ999XX'); // sin espacios ni guiones y en mayúsculas
      expect(el.querySelector('[role=dialog]')).toBeNull();
      expect(toast.toasts()[0].message).toContain('Ingreso de visitante generado');
      expect(tickets().length).toBe(10);
      const row = rowOf(el, '-103')!;
      expect(row.querySelector('.badge')?.textContent?.trim()).toBe('Pendiente de cobro');
    });

    it('el PDF del ingreso es el ticket del módulo admin (el mismo de "Generar PDF"), con el QR del ticket', async () => {
      const { el, click, settle, tickets } = await setup();
      const download = spyDownload();
      await open(click, settle, 'ENTRY');

      typePlate(el, 'ZZ999XX');
      await submit(el, settle);

      expect(download).toHaveBeenCalledTimes(1);
      const receipt = download.mock.calls[0][0];
      const number = receipt.code;
      expect(number).toMatch(/^TKT-\d{8}-103$/);
      expect(receipt.title).toBe('Ticket pendiente de pago');
      expect(receipt.qrData).toBe(`https://parko.example/pagar/${number}`); // el qr_data del ticket
      expect(receipt.rows.find((r) => r.label === 'Patente')?.value).toBe('ZZ 999 XX');
      expect(receipt.rows.find((r) => r.label === 'Tipo')?.value).toBe('Visitante');
      expect(receipt.amount).toBe(3000);

      // es el mismo comprobante que arma "Generar PDF" sobre esa fila de la lista
      download.mockClear();
      (rowOf(el, '-103')!.querySelectorAll('button')[1] as HTMLButtonElement).click();
      await settle();
      expect(download.mock.calls[0][0]).toEqual(receipt);
      expect(tickets().length).toBe(10);
    });

    it('ingreso de una patente registrada que ya quedó pago: no hay ticket para cobrar, no se descarga PDF', async () => {
      const { el, click, settle, toast } = await setup();
      const download = spyDownload();
      await open(click, settle, 'ENTRY');

      typePlate(el, 'NVZ087');
      await submit(el, settle);

      expect(toast.toasts()[0].message).toContain('Ingreso de usuario registrado generado');
      expect(download).not.toHaveBeenCalled();
    });

    it('si falla el PDF, el ingreso queda generado y se avisa', async () => {
      const { el, click, settle, toast } = await setup();
      spyDownload();
      const service = TestBed.inject(PaymentsService);
      vi.spyOn(service, 'ticketExtras').mockReturnValue(throwError(() => new Error('boom')));
      await open(click, settle, 'ENTRY');

      typePlate(el, 'ZZ999XX');
      await submit(el, settle);

      expect(el.querySelector('[role=dialog]')).toBeNull(); // el ingreso se hizo
      const messages = toast.toasts().map((t) => t.message);
      expect(messages.some((m) => m.includes('Ingreso de visitante generado'))).toBe(true);
      expect(messages.some((m) => m.includes('no se pudo preparar el PDF del ticket'))).toBe(true);
    });

    it('si la patente ya está adentro, muestra el error dentro del diálogo y no lo cierra', async () => {
      const { el, click, settle, toast } = await setup();
      await open(click, settle, 'ENTRY');

      typePlate(el, 'AB123CD'); // tiene el ticket 0031 activo en la demostración
      await submit(el, settle);

      expect(el.querySelector('[role=dialog] [role=alert]')?.textContent).toContain('ya tiene un ingreso activo');
      expect(toast.toasts().length).toBe(0);
    });

    it('egreso de una patente con el ticket pagado: lo genera y el ticket queda utilizado', async () => {
      const { el, click, settle, toast } = await setup();
      await open(click, settle, 'EXIT');

      typePlate(el, 'ab123cd'); // ticket 0031, pagado
      await submit(el, settle);

      expect(el.querySelector('[role=dialog]')).toBeNull();
      expect(toast.toasts()[0].message).toContain('Egreso generado para AB123CD');
      expect(rowOf(el, '-0031')!.querySelector('.badge')?.textContent?.trim()).toBe('Utilizado');
    });

    it('egreso con el ticket pendiente de pago: se rechaza y explica por qué', async () => {
      const { el, click, settle } = await setup();
      await open(click, settle, 'EXIT');

      typePlate(el, 'XY987ZW'); // ticket 0042, pendiente
      await submit(el, settle);

      expect(el.querySelector('[role=dialog] [role=alert]')?.textContent).toContain('no está pagado');
      expect(rowOf(el, '-0042')!.querySelector('.badge')?.textContent?.trim()).toBe('Pendiente de cobro');
    });

    it('egreso de una patente sin ingreso activo: informa que no lo tiene', async () => {
      const { el, click, settle } = await setup();
      await open(click, settle, 'EXIT');

      typePlate(el, 'ZZ999XX');
      await submit(el, settle);

      expect(el.querySelector('[role=dialog] [role=alert]')?.textContent).toContain('no tiene un ingreso activo');
    });
  });

  describe('detalle y PDF de cada ticket', () => {
    const buttons = (row: Element) => Array.from(row.querySelectorAll('button')).map((b) => b.textContent?.trim());
    const rowOf = (el: HTMLElement, ticket: string) =>
      Array.from(el.querySelectorAll('.payments tbody tr')).find((r) => r.textContent?.includes(`-${ticket}`))!;
    const dialog = (el: HTMLElement) => el.querySelector('[role=dialog]')!;

    it('todos tienen "Ver detalle" y "Generar PDF", menos los cancelados', async () => {
      const { el } = await setup();
      const rows = el.querySelectorAll('.payments tbody tr');
      expect(buttons(rows[0])).toEqual(['Ver detalle', 'Generar PDF']); // cobrado
      expect(buttons(rows[5])).toEqual(['Ver detalle', 'Generar PDF']); // pendiente
      expect(buttons(rows[7])).toEqual(['Ver detalle', 'Generar PDF']); // utilizado
      expect(buttons(rows[8])).toEqual([]); // cancelado
    });

    it('el detalle de un cobrado muestra el pago (rojo) y no muestra el QR', async () => {
      const { el, click, settle } = await setup();
      (rowOf(el, '0028').querySelector('button') as HTMLButtonElement).click();
      await settle();
      expect(el.querySelector('.receipt__title')?.textContent).toContain('Pago realizado');
      expect(el.querySelector('.receipt__amount--debit')?.textContent?.trim()).toBe('- $980');
      expect(dialog(el).textContent).toContain('Mercado Pago');
      expect(el.querySelector('svg.receipt__qr')).toBeNull();
      expect(click).toBeDefined();
    });

    it('el detalle de un pendiente muestra el ticket a cobrar, sin QR en pantalla', async () => {
      const { el, settle } = await setup();
      (rowOf(el, '0042').querySelector('button') as HTMLButtonElement).click();
      await settle();
      expect(el.querySelector('.receipt__title')?.textContent).toContain('Ticket pendiente de pago');
      expect(dialog(el).textContent).toContain('Pendiente de cobro');
      expect(dialog(el).textContent).toContain('XY 987 ZW');
      expect(el.querySelector('.receipt__amount--debit')).toBeNull();
      expect(el.querySelector('svg.receipt__qr')).toBeNull();
    });

    it('suma el saldo actual del usuario en los detalles, y no en los de un visitante', async () => {
      const { el, settle } = await setup();
      // 0039: pendiente de un usuario registrado
      (rowOf(el, '0039').querySelector('button') as HTMLButtonElement).click();
      await settle();
      expect(dialog(el).textContent).toContain('Saldo del usuario');
      expect(dialog(el).textContent).toContain('$12.500');
      (dialog(el).querySelector('.btn:not(.btn--primary)') as HTMLButtonElement).click();
      await settle();

      // 0008: utilizado, también de un usuario registrado
      (rowOf(el, '0008').querySelector('button') as HTMLButtonElement).click();
      await settle();
      expect(dialog(el).textContent).toContain('$12.500');
      (dialog(el).querySelector('.btn:not(.btn--primary)') as HTMLButtonElement).click();
      await settle();

      // 0042: visitante, no tiene cuenta de saldo
      (rowOf(el, '0042').querySelector('button') as HTMLButtonElement).click();
      await settle();
      expect(dialog(el).textContent).not.toContain('Saldo del usuario');
    });

    it('el PDF de un pendiente lleva el qr_data del ticket para escanearlo y pagarlo', async () => {
      const { el, settle } = await setup();
      const download = vi.spyOn(TestBed.inject(ReceiptService), 'download').mockResolvedValue(true);

      (rowOf(el, '0042').querySelectorAll('button')[1] as HTMLButtonElement).click();
      await settle();

      expect(download).toHaveBeenCalledTimes(1);
      const receipt = download.mock.calls[0][0];
      expect(receipt.title).toBe('Ticket pendiente de pago');
      expect(receipt.qrData).toBe(`https://parko.example/pagar/${MOCK_SAMPLE_TICKETS[0]}`);
    });

    it('el PDF de un cobrado no lleva QR de pago, pero suma el saldo del usuario', async () => {
      const { el, settle } = await setup();
      const download = vi.spyOn(TestBed.inject(ReceiptService), 'download').mockResolvedValue(true);

      (rowOf(el, '0008').querySelectorAll('button')[1] as HTMLButtonElement).click();
      await settle();

      const receipt = download.mock.calls[0][0];
      expect(receipt.qrData).toBeUndefined();
      expect(receipt.rows.find((r) => r.label === 'Saldo del usuario')?.value).toBe('$12.500');
    });
  });
});

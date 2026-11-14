import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

/** Avisos breves de resultado de una acción ("Usuario guardado", "No se pudo guardar"). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message, 8000);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  private show(type: ToastType, message: string, durationMs = 5000): void {
    const id = this.nextId++;
    this._toasts.update((list) => [...list, { id, type, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}

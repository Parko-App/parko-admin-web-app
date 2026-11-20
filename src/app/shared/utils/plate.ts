import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Mismo formato que valida el backend: ABC123 (viejo) o AB123CD (Mercosur). */
const PLATE_PATTERN = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;

/** Mayúsculas y sin espacios ni guiones: "ab 123-cd" -> "AB123CD". */
export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidPlate(raw: string): boolean {
  return PLATE_PATTERN.test(normalizePlate(raw));
}

/** Formato de lectura: "AB123CD" -> "AB 123 CD" y "ABC123" -> "ABC 123". */
export function formatPlate(raw: string | null | undefined): string {
  const plate = normalizePlate(raw ?? '');
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(plate)) {
    return `${plate.slice(0, 2)} ${plate.slice(2, 5)} ${plate.slice(5)}`;
  }
  if (/^[A-Z]{3}\d{3}$/.test(plate)) {
    return `${plate.slice(0, 3)} ${plate.slice(3)}`;
  }
  return plate;
}

export function plateValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  return value.trim() === '' || isValidPlate(value) ? null : { plate: true };
}

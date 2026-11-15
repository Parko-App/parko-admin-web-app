import { AbstractControl, ValidationErrors } from '@angular/forms';

export interface PasswordRule {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

/** Mismas reglas que valida identity-service al crear un usuario. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { key: 'length', label: 'Al menos 10 caracteres', test: (p) => p.length >= 10 },
  { key: 'upper', label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { key: 'digit', label: 'Un número', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'Un carácter especial', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordRulesValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  const failed = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.key);
  return failed.length > 0 ? { passwordRules: failed } : null;
}

/** Validador de grupo: marca error si `password` y `confirmPassword` no coinciden. */
export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordsMismatch: true } : null;
}

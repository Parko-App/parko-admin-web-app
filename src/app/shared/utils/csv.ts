export type CsvCell = string | number | null | undefined;

const needsQuotes = /[";\r\n]/;

function escapeCell(cell: CsvCell): string {
  const text = cell === null || cell === undefined ? '' : String(cell);
  return needsQuotes.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Arma un CSV pensado para Excel en español (separador ";" y BOM UTF-8 para las tildes).
 * Los números van sin formato (punto decimal, sin separador de miles) para que se puedan calcular.
 */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** Descarga un archivo generado en el navegador (CSV, PDF, etc.). */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url));
}

/** Descarga un archivo de texto generado en el navegador. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

/**
 * Matriz de módulos del código QR (true = módulo oscuro). Se dibuja como vector en pantalla y en el PDF,
 * sin depender de canvas ni de imágenes. La librería se carga recién cuando hace falta.
 */
export async function qrMatrix(text: string): Promise<boolean[][]> {
  const module = await import('qrcode');
  const create = module.create ?? module.default?.create;
  const { modules } = create(text, { errorCorrectionLevel: 'M' });
  return Array.from({ length: modules.size }, (_, row) =>
    Array.from({ length: modules.size }, (_, column) => Boolean(modules.get(row, column))),
  );
}

/** Trazado SVG de los módulos oscuros (un cuadradito de 1×1 por módulo). */
export function qrPath(matrix: boolean[][]): string {
  let path = '';
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) {
        path += `M${x} ${y}h1v1h-1z`;
      }
    }),
  );
  return path;
}

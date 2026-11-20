import { Pipe, PipeTransform } from '@angular/core';
import { formatPlate } from '../utils/plate';

/** {{ 'AB123CD' | plate }} -> AB 123 CD */
@Pipe({ name: 'plate' })
export class PlatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatPlate(value);
  }
}

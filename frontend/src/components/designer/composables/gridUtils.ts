import type { SchemaField } from 'src/types/schema';

const GRID_COLS = 12;

/** Sum of colSpan for all fields, subtracted from 12 */
export function remainingCols(fields: SchemaField[]): number {
  return GRID_COLS - fields.reduce((s, f) => s + f.colSpan, 0);
}

/** Clamp colSpan to [1, maxAvailable] */
export function clampColSpan(colSpan: number, maxAvailable: number): number {
  return Math.max(1, Math.min(colSpan, maxAvailable));
}

/** Whether a row has >= 1 remaining column for a new field */
export function canDropInRow(fields: SchemaField[]): boolean {
  return remainingCols(fields) >= 1;
}

/** Compress field.colSpan to fit remaining space in row (excluding the field itself).
 *  Mutates field.colSpan. Returns false if no space (0 remaining). */
export function compressColSpan(field: SchemaField, rowFields: SchemaField[]): boolean {
  const others = rowFields.filter(f => f.id !== field.id);
  const remaining = remainingCols(others);
  if (remaining <= 0) {
    field.colSpan = 1;
    return false;
  }
  field.colSpan = clampColSpan(field.colSpan, remaining);
  return true;
}

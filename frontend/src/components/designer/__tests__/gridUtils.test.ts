import { describe, it, expect } from 'vitest';
import { remainingCols, clampColSpan, canDropInRow, compressColSpan } from '../composables/gridUtils';
import type { SchemaField } from 'src/types/schema';

function makeField(colSpan: number, id = 'f1'): SchemaField {
  return { id, type: 'text', label: 'Test', required: false, colSpan };
}

describe('remainingCols', () => {
  it('returns 12 for empty row', () => {
    expect(remainingCols([])).toBe(12);
  });

  it('subtracts colSpan sum from 12', () => {
    expect(remainingCols([makeField(4), makeField(6)])).toBe(2);
  });

  it('returns 0 when row is full', () => {
    expect(remainingCols([makeField(12)])).toBe(0);
  });

  it('handles multiple small fields', () => {
    expect(remainingCols([makeField(3), makeField(3), makeField(3)])).toBe(3);
  });
});

describe('clampColSpan', () => {
  it('clamps to maxAvailable when colSpan exceeds', () => {
    expect(clampColSpan(8, 4)).toBe(4);
  });

  it('returns colSpan when within limit', () => {
    expect(clampColSpan(3, 4)).toBe(3);
  });

  it('enforces minimum of 1', () => {
    expect(clampColSpan(0, 4)).toBe(1);
  });

  it('enforces minimum of 1 for negative values', () => {
    expect(clampColSpan(-5, 4)).toBe(1);
  });
});

describe('canDropInRow', () => {
  it('returns false when row is full', () => {
    expect(canDropInRow([makeField(12)])).toBe(false);
  });

  it('returns true when 1 column remaining', () => {
    expect(canDropInRow([makeField(6), makeField(5)])).toBe(true);
  });

  it('returns true for empty row', () => {
    expect(canDropInRow([])).toBe(true);
  });
});

describe('compressColSpan', () => {
  it('keeps colSpan when field fits in remaining space', () => {
    const field = makeField(8, 'target');
    const row = [makeField(2, 'a'), field, makeField(2, 'b')];
    const result = compressColSpan(field, row);
    expect(result).toBe(true);
    expect(field.colSpan).toBe(8);
  });

  it('compresses colSpan to remaining space', () => {
    const field = makeField(8, 'target');
    const row = [makeField(5, 'a'), makeField(4, 'b'), field];
    const result = compressColSpan(field, row);
    expect(result).toBe(true);
    expect(field.colSpan).toBe(3);
  });

  it('returns false and sets colSpan to 1 when 0 remaining', () => {
    const field = makeField(8, 'target');
    const row = [makeField(6, 'a'), makeField(6, 'b'), field];
    const result = compressColSpan(field, row);
    expect(result).toBe(false);
    expect(field.colSpan).toBe(1);
  });
});

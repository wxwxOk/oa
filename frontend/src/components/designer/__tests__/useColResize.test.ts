import { describe, it, expect } from 'vitest';

// Import the composable to access calcNewSpan
import { useColResize } from '../composables/useColResize';
import { ref } from 'vue';
import type { SchemaField } from 'src/types/schema';

function makeField(colSpan: number): SchemaField {
  return { id: 'f1', type: 'text', label: 'Test', required: false, colSpan };
}

describe('useColResize - calcNewSpan', () => {
  const field = ref(makeField(4));
  const rowEl = ref(null as HTMLElement | null);
  const maxColSpan = ref(12);
  const { calcNewSpan } = useColResize({ field, rowEl, maxColSpan });

  it('increases colSpan by 1 when dragged right by 1 column width', () => {
    // colWidth = 100 (1200/12), deltaX = 100 => +1 col
    expect(calcNewSpan(4, 100, 100, 8)).toBe(5);
  });

  it('decreases colSpan by 1 when dragged left by 1 column width', () => {
    expect(calcNewSpan(4, -100, 100, 8)).toBe(3);
  });

  it('clamps to minimum of 1', () => {
    // deltaX = -400 => -4 cols, startColSpan=4 => 0, clamped to 1
    expect(calcNewSpan(4, -400, 100, 8)).toBe(1);
  });

  it('clamps to maxColSpan', () => {
    // deltaX = 500 => +5 cols, startColSpan=4 => 9, clamped to 6
    expect(calcNewSpan(4, 500, 100, 6)).toBe(6);
  });

  it('rounds to nearest column (less than half stays same)', () => {
    // deltaX = 49 => round(0.49) = 0 delta cols
    expect(calcNewSpan(4, 49, 100, 8)).toBe(4);
  });

  it('rounds to nearest column (more than half snaps)', () => {
    // deltaX = 51 => round(0.51) = 1 delta col
    expect(calcNewSpan(4, 51, 100, 8)).toBe(5);
  });

  it('handles zero delta', () => {
    expect(calcNewSpan(4, 0, 100, 8)).toBe(4);
  });
});

describe('useColResize - state', () => {
  it('initializes isResizing as false', () => {
    const field = ref(makeField(4));
    const rowEl = ref(null as HTMLElement | null);
    const maxColSpan = ref(12);
    const { isResizing } = useColResize({ field, rowEl, maxColSpan });
    expect(isResizing.value).toBe(false);
  });
});

import { ref, type Ref } from 'vue';
import type { SchemaField } from 'src/types/schema';

interface UseColResizeOptions {
  field: Ref<SchemaField>;
  rowEl: Ref<HTMLElement | null>;
  maxColSpan: Ref<number>;
}

export function useColResize({ field, rowEl, maxColSpan }: UseColResizeOptions) {
  const isResizing = ref(false);

  function calcNewSpan(startColSpan: number, deltaX: number, colWidth: number, max: number): number {
    const deltaCols = Math.round(deltaX / colWidth);
    return Math.max(1, Math.min(max, startColSpan + deltaCols));
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isResizing.value = true;

    const startX = e.clientX;
    const startColSpan = field.value.colSpan;
    const colWidth = rowEl.value!.clientWidth / 12;

    function onPointerMove(ev: PointerEvent) {
      field.value.colSpan = calcNewSpan(startColSpan, ev.clientX - startX, colWidth, maxColSpan.value);
    }

    function onPointerUp() {
      isResizing.value = false;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  return { isResizing, onPointerDown, calcNewSpan };
}

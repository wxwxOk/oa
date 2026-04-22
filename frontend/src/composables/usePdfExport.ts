import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- Types ---

export interface BreakCandidate {
  y: number;
  type: 'row' | 'group-start' | 'group-row' | 'table-start' | 'table-row';
  isTableInternal: boolean;
  tableHeaderRect?: { y: number; height: number };
}

export interface PageSlice {
  startY: number;
  endY: number;
  needsTableHeader: boolean;
  tableHeaderRect?: { y: number; height: number };
}

// --- Constants ---

const A4_HEIGHT = 297;
const MARGIN = 15;
const HEADER_HEIGHT = 10;
const FOOTER_HEIGHT = 10;
const CONTENT_TOP = MARGIN + HEADER_HEIGHT;
const CONTENT_BOTTOM = A4_HEIGHT - MARGIN - FOOTER_HEIGHT;
const MAX_CONTENT_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP;
const HEADER_Y = 8;
const FOOTER_Y = A4_HEIGHT - 8;

// --- Pure functions (exported for testing) ---

/**
 * Scan container for all [data-break] elements, collect Y coordinates.
 */
export function collectBreakpoints(container: HTMLElement): BreakCandidate[] {
  const containerRect = container.getBoundingClientRect();
  const candidates: BreakCandidate[] = [];

  const breakEls = container.querySelectorAll('[data-break]');
  for (const el of breakEls) {
    const rect = el.getBoundingClientRect();
    const y = rect.top - containerRect.top;
    const breakType = el.getAttribute('data-break') as string;

    let type: BreakCandidate['type'];
    let isTableInternal = false;
    let tableHeaderRect: { y: number; height: number } | undefined;

    switch (breakType) {
      case 'row':
        type = 'row';
        break;
      case 'group':
        type = 'group-start';
        break;
      case 'table':
        type = 'table-start';
        break;
      case 'table-row': {
        type = 'table-row';
        isTableInternal = true;
        const thead = el.closest('table')?.querySelector('[data-thead]');
        if (thead) {
          const theadRect = thead.getBoundingClientRect();
          tableHeaderRect = {
            y: theadRect.top - containerRect.top,
            height: theadRect.height,
          };
        }
        break;
      }
      default:
        type = 'row';
    }

    candidates.push({ y, type, isTableInternal, tableHeaderRect });
  }

  return candidates.sort((a, b) => a.y - b.y);
}

/**
 * Find the best break candidate at or before pageBottom.
 */
export function findBestBreak(
  candidates: BreakCandidate[],
  pageBottom: number,
): BreakCandidate | null {
  let best: BreakCandidate | null = null;
  for (const c of candidates) {
    if (c.y <= pageBottom) best = c;
    else break;
  }
  return best;
}

/**
 * Compute page slices from breakpoints.
 */
export function computePageSlices(
  breakpoints: BreakCandidate[],
  totalHeight: number,
  pageContentHeight: number,
  scale: number,
): PageSlice[] {
  const slices: PageSlice[] = [];
  let currentY = 0;

  while (currentY < totalHeight) {
    const pageBottom = currentY + pageContentHeight;

    if (pageBottom >= totalHeight) {
      slices.push({ startY: currentY, endY: totalHeight, needsTableHeader: false });
      break;
    }

    const best = findBestBreak(breakpoints, pageBottom / scale);

    if (best && best.y * scale > currentY) {
      const cutY = best.y * scale;

      // If ALL remaining content from currentY fits in one page, no need to break
      if (totalHeight - currentY <= pageContentHeight) {
        slices.push({ startY: currentY, endY: totalHeight, needsTableHeader: false });
        break;
      }

      slices.push({
        startY: currentY,
        endY: cutY,
        needsTableHeader: false,
      });
      currentY = cutY;
    } else {
      console.warn('[PDF] 无法找到安全切点，强制分页');
      slices.push({ startY: currentY, endY: pageBottom, needsTableHeader: false });
      currentY = pageBottom;
    }
  }

  // Post-process: mark slices that need table header
  // A slice needs table header if the previous slice's cut was inside a table
  for (let i = 1; i < slices.length; i++) {
    const prevEndY = slices[i - 1].endY;
    // Find the breakpoint at prevEndY
    const cutBreak = breakpoints.find(
      (b) => Math.abs(b.y * scale - prevEndY) < 1,
    );
    if (cutBreak && cutBreak.isTableInternal && cutBreak.tableHeaderRect) {
      slices[i].needsTableHeader = true;
      slices[i].tableHeaderRect = cutBreak.tableHeaderRect;
    }
  }

  return slices;
}

/**
 * Render text to a canvas image (supports CJK via browser font engine).
 */
function textToImageData(
  text: string,
  fontSize: number,
  color: string,
  align: CanvasTextAlign,
  widthPx: number,
): string {
  const dpr = 3;
  const h = fontSize + 6;
  const c = document.createElement('canvas');
  c.width = widthPx * dpr;
  c.height = h * dpr;
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.font = `${fontSize}px "PingFang SC","Microsoft YaHei","Heiti SC",sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  const x = align === 'center' ? widthPx / 2 : align === 'right' ? widthPx : 0;
  ctx.fillText(text, x, h / 2);
  return c.toDataURL('image/png');
}

/**
 * Inject header (form title) and footer (submit time + page number) on every page.
 */
export function injectHeaderFooter(
  pdf: jsPDF,
  formTitle: string,
  submitTime: string,
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const totalPages = pdf.internal.getNumberOfPages();
  const textWidthPx = contentWidth * MM_TO_PX;
  const textH = 4; // mm height for text image

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    // Header: centered form title
    if (formTitle) {
      const headerImg = textToImageData(formTitle, 10, '#666666', 'center', textWidthPx);
      pdf.addImage(headerImg, 'PNG', MARGIN, HEADER_Y - 1, contentWidth, textH);
    }

    // Footer left: submit time
    if (submitTime) {
      const footerLeftImg = textToImageData(submitTime, 9, '#666666', 'left', textWidthPx);
      pdf.addImage(footerLeftImg, 'PNG', MARGIN, FOOTER_Y - 2, contentWidth, textH);
    }

    // Footer right: page number
    const pageText = `${i} / ${totalPages}`;
    const footerRightImg = textToImageData(pageText, 9, '#666666', 'right', textWidthPx);
    pdf.addImage(footerRightImg, 'PNG', MARGIN, FOOTER_Y - 2, contentWidth, textH);
  }
}

// --- Internal helpers ---

const MM_TO_PX = 96 / 25.4;

function renderPageSlice(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  slice: PageSlice,
  contentWidth: number,
  scale: number,
  quality: number,
  isFirstPage: boolean,
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const slicePixelHeight = slice.endY - slice.startY;
  if (slicePixelHeight <= 0) return;

  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = canvas.width;

  let headerPixelHeight = 0;
  if (slice.needsTableHeader && slice.tableHeaderRect) {
    headerPixelHeight = slice.tableHeaderRect.height * scale;
  }

  sliceCanvas.height = Math.ceil(slicePixelHeight + headerPixelHeight);
  const ctx = sliceCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  let drawY = 0;

  // Draw table header at top if needed
  if (slice.needsTableHeader && slice.tableHeaderRect) {
    const thY = slice.tableHeaderRect.y * scale;
    const thH = slice.tableHeaderRect.height * scale;
    ctx.drawImage(canvas, 0, thY, canvas.width, thH, 0, 0, canvas.width, thH);
    drawY = thH;
  }

  // Draw content slice
  ctx.drawImage(
    canvas,
    0, slice.startY, canvas.width, slicePixelHeight,
    0, drawY, canvas.width, slicePixelHeight,
  );

  const sliceData = sliceCanvas.toDataURL('image/jpeg', quality);
  const sliceMmHeight = (sliceCanvas.height * contentWidth) / canvas.width;

  if (!isFirstPage) pdf.addPage();
  pdf.addImage(sliceData, 'JPEG', MARGIN, CONTENT_TOP, contentWidth, sliceMmHeight);
}

// --- Public API (signatures unchanged per D-03) ---

const A4_CONTENT_WIDTH_PX = Math.round((210 - MARGIN * 2) * MM_TO_PX); // ~680px

export async function exportToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const formTitle = element.getAttribute('data-form-title') || '';
  const submitTime = element.getAttribute('data-submit-time') || '';

  // Lock element width to A4 content width to prevent scaling distortion
  const origWidth = element.style.width;
  const origMaxWidth = element.style.maxWidth;
  element.style.width = `${A4_CONTENT_WIDTH_PX}px`;
  element.style.maxWidth = `${A4_CONTENT_WIDTH_PX}px`;

  // Wait for reflow
  await new Promise(r => setTimeout(r, 50));

  const breakpoints = collectBreakpoints(element);

  // Canvas safety check
  const elementHeight = element.scrollHeight || element.offsetHeight;
  const scale = 2;
  if (elementHeight * scale > 16000) {
    console.warn('[PDF] Canvas height exceeds safe threshold:', elementHeight * scale);
  }

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  // Restore original width
  element.style.width = origWidth;
  element.style.maxWidth = origMaxWidth;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;

  if (imgHeight <= MAX_CONTENT_HEIGHT) {
    // Single page
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', MARGIN, CONTENT_TOP, contentWidth, imgHeight);
  } else {
    // Multi-page with smart pagination
    const pageContentHeightPx = MAX_CONTENT_HEIGHT * MM_TO_PX * scale;
    const slices = computePageSlices(breakpoints, canvas.height, pageContentHeightPx, scale);

    for (let i = 0; i < slices.length; i++) {
      renderPageSlice(pdf, canvas, slices[i], contentWidth, scale, 0.95, i === 0);
    }
  }

  injectHeaderFooter(pdf, formTitle, submitTime);
  pdf.save(filename);
}

export async function exportBatchToPdf(
  renderFn: (index: number) => Promise<HTMLElement>,
  total: number,
  filename: string,
  onProgress?: (current: number, total: number) => void,
  cancelRef?: { value: boolean },
): Promise<boolean> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const scale = 1.5;
  const quality = 0.9;
  let isFirstSubmission = true;

  for (let i = 0; i < total; i++) {
    if (cancelRef?.value) return false;
    onProgress?.(i + 1, total);

    const element = await renderFn(i);
    const formTitle = element.getAttribute('data-form-title') || '';
    const submitTime = element.getAttribute('data-submit-time') || '';

    // Lock width for consistent A4 rendering
    const origW = element.style.width;
    const origMW = element.style.maxWidth;
    element.style.width = `${A4_CONTENT_WIDTH_PX}px`;
    element.style.maxWidth = `${A4_CONTENT_WIDTH_PX}px`;
    await new Promise(r => setTimeout(r, 50));

    const breakpoints = collectBreakpoints(element);

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    element.style.width = origW;
    element.style.maxWidth = origMW;

    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    if (!isFirstSubmission) pdf.addPage();

    if (imgHeight <= MAX_CONTENT_HEIGHT) {
      const imgData = canvas.toDataURL('image/jpeg', quality);
      pdf.addImage(imgData, 'JPEG', MARGIN, CONTENT_TOP, contentWidth, imgHeight);
    } else {
      const pageContentHeightPx = MAX_CONTENT_HEIGHT * MM_TO_PX * scale;
      const slices = computePageSlices(breakpoints, canvas.height, pageContentHeightPx, scale);

      for (let j = 0; j < slices.length; j++) {
        renderPageSlice(
          pdf, canvas, slices[j], contentWidth, scale, quality,
          j === 0 && isFirstSubmission,
        );
      }
    }

    isFirstSubmission = false;
  }

  // Inject header/footer across all pages for all submissions
  // Use the last submission's metadata as fallback (batch mode)
  const lastElement = await renderFn(total - 1);
  const batchTitle = lastElement.getAttribute('data-form-title') || '';
  const batchTime = lastElement.getAttribute('data-submit-time') || '';
  injectHeaderFooter(pdf, batchTitle, batchTime);

  pdf.save(filename);
  return true;
}

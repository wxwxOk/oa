import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock canvas 2D context for textToImageData
const mockCtx = {
  scale: vi.fn(),
  fillText: vi.fn(),
  fillStyle: '',
  font: '',
  textBaseline: '',
  textAlign: '',
  drawImage: vi.fn(),
};
const origCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'canvas') {
    const c = origCreateElement('canvas');
    vi.spyOn(c, 'getContext').mockReturnValue(mockCtx as any);
    vi.spyOn(c, 'toDataURL').mockReturnValue('data:image/png;base64,mock');
    return c;
  }
  return origCreateElement(tag);
});

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    width: 1588,
    height: 4000,
    toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mock'),
    getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
  }),
}));

// Mock jsPDF
const mockPdf = {
  internal: {
    pageSize: { getWidth: () => 210, getHeight: () => 297 },
    getNumberOfPages: vi.fn().mockReturnValue(2),
  },
  addImage: vi.fn(),
  addPage: vi.fn(),
  setPage: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  save: vi.fn(),
};
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockPdf),
}));

import {
  findBestBreak,
  computePageSlices,
  injectHeaderFooter,
  type BreakCandidate,
} from '../usePdfExport';

// A4 constants (matching usePdfExport.ts)
const SCALE = 2;
const CONTENT_HEIGHT_MM = 247;
const MM_TO_PX = 96 / 25.4;
const PAGE_CONTENT_HEIGHT_PX = CONTENT_HEIGHT_MM * MM_TO_PX * SCALE;

beforeEach(() => {
  vi.clearAllMocks();
  mockPdf.internal.getNumberOfPages.mockReturnValue(2);
});

describe('findBestBreak', () => {
  it('返回 pageBottom 之前最近的候选切点', () => {
    const candidates: BreakCandidate[] = [
      { y: 100, type: 'row', isTableInternal: false },
      { y: 200, type: 'row', isTableInternal: false },
      { y: 300, type: 'row', isTableInternal: false },
    ];
    const result = findBestBreak(candidates, 250);
    expect(result).not.toBeNull();
    expect(result!.y).toBe(200);
  });

  it('没有 <= pageBottom 的候选时返回 null', () => {
    const candidates: BreakCandidate[] = [
      { y: 100, type: 'row', isTableInternal: false },
      { y: 200, type: 'row', isTableInternal: false },
    ];
    const result = findBestBreak(candidates, 50);
    expect(result).toBeNull();
  });

  it('精确匹配 pageBottom 时返回该候选', () => {
    const candidates: BreakCandidate[] = [
      { y: 100, type: 'row', isTableInternal: false },
      { y: 200, type: 'row', isTableInternal: false },
      { y: 300, type: 'row', isTableInternal: false },
    ];
    const result = findBestBreak(candidates, 300);
    expect(result).not.toBeNull();
    expect(result!.y).toBe(300);
  });

  it('空候选数组返回 null', () => {
    const result = findBestBreak([], 500);
    expect(result).toBeNull();
  });
});

describe('computePageSlices', () => {
  it('单页内容返回 1 个 slice', () => {
    const slices = computePageSlices([], 500, PAGE_CONTENT_HEIGHT_PX, SCALE);
    expect(slices).toHaveLength(1);
    expect(slices[0].startY).toBe(0);
    expect(slices[0].endY).toBe(500);
  });

  it('多页内容在切点处正确分割', () => {
    const breakpoints: BreakCandidate[] = [
      { y: 0, type: 'row', isTableInternal: false },
      { y: 900, type: 'row', isTableInternal: false },
      { y: 1800, type: 'row', isTableInternal: false },
    ];
    const totalHeight = PAGE_CONTENT_HEIGHT_PX * 2;
    const slices = computePageSlices(breakpoints, totalHeight, PAGE_CONTENT_HEIGHT_PX, SCALE);
    expect(slices.length).toBeGreaterThanOrEqual(2);
    expect(slices[0].startY).toBe(0);
    expect(slices[slices.length - 1].endY).toBe(totalHeight);
  });

  it('无安全切点时强制分页并输出警告', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slices = computePageSlices([], 4000, PAGE_CONTENT_HEIGHT_PX, SCALE);
    expect(slices.length).toBeGreaterThan(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('无法找到安全切点'),
    );
    warnSpy.mockRestore();
  });

  it('动态表格内部切点标记 needsTableHeader', () => {
    const breakpoints: BreakCandidate[] = [
      { y: 0, type: 'row', isTableInternal: false },
      { y: 500, type: 'table-start', isTableInternal: false },
      { y: 530, type: 'table-row', isTableInternal: true, tableHeaderRect: { y: 500, height: 30 } },
      { y: 900, type: 'table-row', isTableInternal: true, tableHeaderRect: { y: 500, height: 30 } },
      { y: 1300, type: 'table-row', isTableInternal: true, tableHeaderRect: { y: 500, height: 30 } },
      { y: 1700, type: 'table-row', isTableInternal: true, tableHeaderRect: { y: 500, height: 30 } },
    ];
    const totalHeight = PAGE_CONTENT_HEIGHT_PX * 2;
    const slices = computePageSlices(breakpoints, totalHeight, PAGE_CONTENT_HEIGHT_PX, SCALE);
    const headerSlices = slices.filter((s) => s.needsTableHeader);
    expect(headerSlices.length).toBeGreaterThanOrEqual(1);
    expect(headerSlices[0].tableHeaderRect).toBeDefined();
    expect(headerSlices[0].tableHeaderRect!.y).toBe(500);
  });
});

describe('injectHeaderFooter', () => {
  it('2 页 PDF 每页注入页眉和页脚 (via addImage)', () => {
    mockPdf.internal.getNumberOfPages.mockReturnValue(2);
    injectHeaderFooter(mockPdf as any, '员工入职登记表', '2026-04-21 10:30');
    expect(mockPdf.setPage).toHaveBeenCalledWith(1);
    expect(mockPdf.setPage).toHaveBeenCalledWith(2);
    // Each page: 1 header + 1 footer-left + 1 footer-right = 3 addImage calls
    // 2 pages = 6 addImage calls for header/footer
    expect(mockPdf.addImage).toHaveBeenCalled();
    const addImageCalls = mockPdf.addImage.mock.calls;
    // Verify PNG images are used (canvas-rendered text)
    const pngCalls = addImageCalls.filter((c: any[]) => c[1] === 'PNG');
    expect(pngCalls.length).toBe(6); // 3 per page * 2 pages
  });

  it('单页 PDF 也显示页眉页脚', () => {
    mockPdf.internal.getNumberOfPages.mockReturnValue(1);
    injectHeaderFooter(mockPdf as any, '员工入职登记表', '2026-04-21 10:30');
    expect(mockPdf.setPage).toHaveBeenCalledWith(1);
    const pngCalls = mockPdf.addImage.mock.calls.filter((c: any[]) => c[1] === 'PNG');
    expect(pngCalls.length).toBe(3); // header + footer-left + footer-right
  });

  it('setPage 被调用 N 次（N = 总页数）', () => {
    mockPdf.internal.getNumberOfPages.mockReturnValue(3);
    injectHeaderFooter(mockPdf as any, '测试表单', '2026-04-22 09:00');
    expect(mockPdf.setPage).toHaveBeenCalledTimes(3);
    expect(mockPdf.setPage).toHaveBeenCalledWith(1);
    expect(mockPdf.setPage).toHaveBeenCalledWith(2);
    expect(mockPdf.setPage).toHaveBeenCalledWith(3);
  });

  it('页眉 y 约 8mm，页脚 y 约 pageHeight - 8mm', () => {
    mockPdf.internal.getNumberOfPages.mockReturnValue(1);
    injectHeaderFooter(mockPdf as any, '测试', '2026-04-22 09:00');
    const pageHeight = 297;
    // addImage calls: (data, format, x, y, w, h)
    const pngCalls = mockPdf.addImage.mock.calls.filter((c: any[]) => c[1] === 'PNG');
    expect(pngCalls.length).toBe(3);
    // Header y (index 3 in addImage args) should be around 7mm (HEADER_Y - 1)
    const headerY = pngCalls[0][3];
    expect(headerY).toBeGreaterThanOrEqual(5);
    expect(headerY).toBeLessThanOrEqual(10);
    // Footer y should be around pageHeight - 10
    const footerY = pngCalls[1][3];
    expect(footerY).toBeGreaterThanOrEqual(pageHeight - 12);
    expect(footerY).toBeLessThanOrEqual(pageHeight - 4);
  });
});

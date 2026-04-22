import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    expect(slices.length).toBe(2);
    expect(slices[0].startY).toBe(0);
    expect(slices[1].endY).toBe(totalHeight);
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
  it('2 页 PDF 每页注入页眉和页脚', () => {
    mockPdf.internal.getNumberOfPages.mockReturnValue(2);
    injectHeaderFooter(mockPdf as any, '员工入职登记表', '2026-04-21 10:30');
    expect(mockPdf.setPage).toHaveBeenCalledWith(1);
    expect(mockPdf.setPage).toHaveBeenCalledWith(2);
    // 页眉：表单名称居中
    expect(mockPdf.text).toHaveBeenCalledWith(
      '员工入职登记表',
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: 'center' }),
    );
    // 页脚：页码
    expect(mockPdf.text).toHaveBeenCalledWith(
      '2 / 2',
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: 'right' }),
    );
  });

  it('单页 PDF 也显示页眉页脚', () => {
    mockPdf.internal.getNumberOfPages.mockReturnValue(1);
    injectHeaderFooter(mockPdf as any, '员工入职登记表', '2026-04-21 10:30');
    expect(mockPdf.setPage).toHaveBeenCalledWith(1);
    expect(mockPdf.text).toHaveBeenCalledWith(
      '员工入职登记表',
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: 'center' }),
    );
    // 页码为 "1 / 1"
    expect(mockPdf.text).toHaveBeenCalledWith(
      '1 / 1',
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: 'right' }),
    );
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
    // 检查 text 调用中的 y 坐标
    const textCalls = mockPdf.text.mock.calls;
    const headerCall = textCalls.find(
      (c: any[]) => c[0] === '测试' && c[3]?.align === 'center',
    );
    const footerCall = textCalls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('1 / 1'),
    );
    expect(headerCall).toBeDefined();
    expect(footerCall).toBeDefined();
    // 页眉 y 在 6-10mm 范围
    expect(headerCall![2]).toBeGreaterThanOrEqual(6);
    expect(headerCall![2]).toBeLessThanOrEqual(10);
    // 页脚 y 在 pageHeight - 10 到 pageHeight - 6 范围
    expect(footerCall![2]).toBeGreaterThanOrEqual(pageHeight - 10);
    expect(footerCall![2]).toBeLessThanOrEqual(pageHeight - 6);
  });
});

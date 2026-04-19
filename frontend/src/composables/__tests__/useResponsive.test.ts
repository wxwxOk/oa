import { describe, it, expect, vi } from 'vitest';

// 模拟 Quasar 的 useQuasar
const mockScreen = { gt: { sm: true } };
vi.mock('quasar', () => ({
  useQuasar: () => ({ screen: mockScreen }),
}));

import { useResponsive } from '../useResponsive';

describe('useResponsive', () => {
  it('isDesktop 为 true 当 screen.gt.sm 为 true', () => {
    mockScreen.gt.sm = true;
    const { isDesktop, isMobile } = useResponsive();
    expect(isDesktop.value).toBe(true);
    expect(isMobile.value).toBe(false);
  });

  it('isMobile 为 true 当 screen.gt.sm 为 false', () => {
    mockScreen.gt.sm = false;
    const { isDesktop, isMobile } = useResponsive();
    expect(isDesktop.value).toBe(false);
    expect(isMobile.value).toBe(true);
  });

  it('isDesktop 和 isMobile 互斥', () => {
    mockScreen.gt.sm = true;
    const { isDesktop, isMobile } = useResponsive();
    expect(isDesktop.value).not.toBe(isMobile.value);
  });
});

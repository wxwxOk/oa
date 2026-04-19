import { describe, it, expect, vi, beforeEach } from 'vitest';

// 模拟 Quasar 的 useQuasar 和 Dark
const mockDark = { isActive: false, toggle: vi.fn() };
vi.mock('quasar', () => ({
  useQuasar: () => ({ dark: mockDark }),
}));

import { useDarkMode } from '../useDarkMode';

describe('useDarkMode', () => {
  beforeEach(() => {
    mockDark.isActive = false;
    mockDark.toggle.mockClear();
    localStorage.clear();
  });

  it('isDark 反映 $q.dark.isActive', () => {
    mockDark.isActive = true;
    const { isDark } = useDarkMode();
    expect(isDark.value).toBe(true);
  });

  it('toggleDark 调用 $q.dark.toggle()', () => {
    const { toggleDark } = useDarkMode();
    toggleDark();
    expect(mockDark.toggle).toHaveBeenCalledOnce();
  });

  it('toggleDark 将状态持久化到 localStorage', () => {
    mockDark.isActive = false;
    mockDark.toggle.mockImplementation(() => {
      mockDark.isActive = true;
    });
    const { toggleDark } = useDarkMode();
    toggleDark();
    expect(localStorage.getItem('oa-dark-mode')).toBe('true');
  });
});

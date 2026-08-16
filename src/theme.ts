import { createContext } from 'react';

/** 当前是否为暗色主题（供异步 chunk 内的组件消费） */
export const ThemeContext = createContext(false);

const STORAGE_KEY = 'sake-theme';

/** 初始主题：localStorage 中的手动选择优先，否则跟随系统 */
export function getInitialDark(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return saved === 'dark';
    }
  } catch {
    /* ignore */
  }
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function persistDark(dark: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    /* ignore */
  }
}

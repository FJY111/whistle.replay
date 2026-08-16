const STORAGE_KEY = 'sake-recent-dirs';
const MAX_DIRS = 8;

export function getRecentDirs(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
}

export function rememberDir(dir: string): void {
  const next = dir.trim();
  if (!next) {
    return;
  }
  const dirs = [next, ...getRecentDirs().filter((item) => item !== next)].slice(0, MAX_DIRS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dirs));
  } catch {
    /* ignore */
  }
}

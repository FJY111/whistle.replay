import type {
  CapturesResult,
  ListFilesResult,
  ReadFileResult,
  ReplayRule,
  RulesResult,
  SaveRule,
  Settings,
  WriteFileResult,
} from './types';

export async function getSettings(): Promise<Settings> {
  const res = await fetch('cgi-bin/get-settings', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('load failed');
  }
  return res.json() as Promise<Settings>;
}

export async function listFiles(dir: string): Promise<ListFilesResult> {
  const res = await fetch(`cgi-bin/list-files?dir=${encodeURIComponent(dir)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('load failed');
  }
  return res.json() as Promise<ListFilesResult>;
}

export async function readFile(dir: string, file: string): Promise<ReadFileResult> {
  const res = await fetch(
    `cgi-bin/read-file?dir=${encodeURIComponent(dir)}&file=${encodeURIComponent(file)}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    throw new Error('load failed');
  }
  return res.json() as Promise<ReadFileResult>;
}

export async function writeFile(
  dir: string,
  file: string,
  content: string,
): Promise<WriteFileResult> {
  const res = await fetch('cgi-bin/write-file', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dir, file, content }),
  });
  if (!res.ok) {
    throw new Error('save failed');
  }
  return res.json() as Promise<WriteFileResult>;
}

async function postForm<T>(url: string, data: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data).toString(),
  });
  if (!res.ok) {
    throw new Error('post failed');
  }
  return res.json() as Promise<T>;
}

export function setActive(
  active: boolean,
  type: 'save' | 'replay',
): Promise<{ ec: number; active: boolean }> {
  return postForm('cgi-bin/set-active', { active: active ? '1' : '0', type });
}

export function setSaveRules(rules: SaveRule[]): Promise<RulesResult> {
  return postForm('cgi-bin/set-save-rules', { rules: JSON.stringify(rules) });
}

export async function listCaptures(): Promise<CapturesResult> {
  const res = await fetch('cgi-bin/list-captures', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('load failed');
  }
  return res.json() as Promise<CapturesResult>;
}

export function setCaptureSkip(dir: string, file: string, skip: boolean): Promise<RulesResult> {
  return postForm('cgi-bin/set-capture-skip', { dir, file, skip: skip ? '1' : '0' });
}

export function deleteCapture(dir: string, file: string): Promise<RulesResult> {
  return postForm('cgi-bin/delete-capture', { dir, file });
}

export function setReplayRules(rules: ReplayRule[]): Promise<RulesResult> {
  return postForm('cgi-bin/set-replay-rules', { rules: JSON.stringify(rules) });
}

export function setBlockRules(rules: ReplayRule[]): Promise<RulesResult> {
  return postForm('cgi-bin/set-block-rules', { rules: JSON.stringify(rules) });
}

/** 把外部输入清洗为合法的规则列表（去重、封顶、填默认值；纯函数，id 生成除外） */

import {
  DEFAULT_MAX_BODY_KB,
  HTTP_METHODS,
  MAX_BODY_KB_LIMIT,
  MAX_DIR_LEN,
  MAX_ID_LEN,
  MAX_NAME_LEN,
  MAX_PATTERN_LEN,
  MAX_RULES,
  type ReplayRule,
  SAVE_TYPES,
  type SaveRule,
  type SaveType,
} from './model';
import { isValidPattern } from './pattern';
import { normalizeStatusCodes } from './statusCodes';

let idCounter = 0;
const genId = (): string => {
  idCounter = (idCounter + 1) % 1296;
  return `r${Date.now().toString(36)}${idCounter.toString(36)}`;
};

/** 文件名必须留在目录内：拒绝路径分隔符、.. 与隐藏文件 */
export const isSafeFileName = (name: unknown): name is string =>
  typeof name === 'string' &&
  name.length > 0 &&
  name.length <= 255 &&
  /\.(json|txt)$/i.test(name) &&
  !name.startsWith('.') &&
  !name.includes('..') &&
  !/[\\/]/.test(name);

const toId = (val: unknown): string =>
  typeof val === 'string' && val && val.length <= MAX_ID_LEN && !/[\\/]/.test(val) ? val : genId();

const toName = (val: unknown, fallback: string): string => {
  const name = typeof val === 'string' ? val.trim().slice(0, MAX_NAME_LEN) : '';
  return name || fallback;
};

const toPattern = (val: unknown): string | null => {
  if (typeof val !== 'string') {
    return null;
  }
  const pattern = val.trim();
  if (!pattern || pattern.length > MAX_PATTERN_LEN || !isValidPattern(pattern)) {
    return null;
  }
  return pattern;
};

const toMethods = (val: unknown): string[] => {
  if (!Array.isArray(val)) {
    return [];
  }
  const known = new Set<string>(HTTP_METHODS);
  const result: string[] = [];
  for (const item of val) {
    if (typeof item !== 'string') {
      continue;
    }
    const method = item.toUpperCase();
    if (known.has(method) && !result.includes(method)) {
      result.push(method);
    }
  }
  return result;
};

const toDir = (val: unknown): string =>
  typeof val === 'string' ? val.trim().slice(0, MAX_DIR_LEN) : '';

const toSaveTypes = (val: unknown): SaveType[] => {
  if (!Array.isArray(val)) {
    return ['json', 'text'];
  }
  const result = val.filter((item): item is SaveType => SAVE_TYPES.includes(item as SaveType));
  return result.length ? [...new Set(result)] : ['json', 'text'];
};

const toMaxBodyKB = (val: unknown): number => {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return DEFAULT_MAX_BODY_KB;
  }
  return Math.min(MAX_BODY_KB_LIMIT, Math.max(0, Math.round(val)));
};

export function sanitizeSaveRules(input: unknown): SaveRule[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<string>();
  const result: SaveRule[] = [];
  for (const item of input) {
    if (result.length >= MAX_RULES) {
      break;
    }
    if (!item || typeof item !== 'object') {
      continue;
    }
    const raw = item as Record<string, unknown>;
    const pattern = toPattern(raw.pattern);
    if (pattern === null) {
      continue;
    }
    const id = toId(raw.id);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push({
      id,
      name: toName(raw.name, `规则 ${String(result.length + 1)}`),
      enabled: raw.enabled === true,
      pattern,
      methods: toMethods(raw.methods),
      dir: toDir(raw.dir),
      saveTypes: toSaveTypes(raw.saveTypes),
      maxBodyKB: toMaxBodyKB(raw.maxBodyKB),
      statusCodes: normalizeStatusCodes(raw.statusCodes),
      prettyJson: raw.prettyJson === true,
    });
  }
  return result;
}

export function sanitizeReplayRules(input: unknown): ReplayRule[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<string>();
  const result: ReplayRule[] = [];
  for (const item of input) {
    if (result.length >= MAX_RULES) {
      break;
    }
    if (!item || typeof item !== 'object') {
      continue;
    }
    const raw = item as Record<string, unknown>;
    const pattern = toPattern(raw.pattern);
    if (pattern === null) {
      continue;
    }
    const id = toId(raw.id);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push({
      id,
      name: toName(raw.name, `回放 ${String(result.length + 1)}`),
      enabled: raw.enabled === true,
      pattern,
      methods: toMethods(raw.methods),
    });
  }
  return result;
}

const parseRules = <T>(raw: unknown, sanitize: (input: unknown) => T[]): T[] => {
  if (typeof raw !== 'string' || !raw) {
    return [];
  }
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return [];
  }
};

/** 从 storage 中的 JSON 字符串解析规则列表 */
export const parseSaveRules = (raw: unknown): SaveRule[] => parseRules(raw, sanitizeSaveRules);
export const parseReplayRules = (raw: unknown): ReplayRule[] =>
  parseRules(raw, sanitizeReplayRules);

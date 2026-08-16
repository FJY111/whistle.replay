/** 把外部输入清洗为合法的规则列表（去重、封顶、填默认值；纯函数，id 生成除外） */

import {
  DEFAULT_DELAY,
  DEFAULT_HIT_RATE,
  DEFAULT_MAX_BODY_KB,
  DEFAULT_STATUS_CODE,
  HTTP_METHODS,
  MAX_BODY_KB_LIMIT,
  MAX_DELAY,
  MAX_DIR_LEN,
  MAX_FILES_PER_RULE,
  MAX_HEADER_NAME_LEN,
  MAX_HEADER_VALUE_LEN,
  MAX_HEADERS,
  MAX_ID_LEN,
  MAX_NAME_LEN,
  MAX_PATTERN_LEN,
  MAX_RULES,
  type MockMode,
  type MockRule,
  type MockType,
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

const toMode = (val: unknown): MockMode =>
  val === 'round-robin' || val === 'random' ? val : 'fixed';

const toType = (val: unknown, firstFile: string): MockType => {
  if (val === 'json' || val === 'text' || val === 'sse') {
    return val;
  }
  return /\.json$/i.test(firstFile) ? 'json' : 'text';
};

const toDelay = (val: unknown): number => {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return DEFAULT_DELAY;
  }
  return Math.min(MAX_DELAY, Math.max(0, Math.round(val)));
};

const toHitRate = (val: unknown): number => {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return DEFAULT_HIT_RATE;
  }
  return Math.min(100, Math.max(1, Math.round(val)));
};

const toStatusCode = (val: unknown): number => {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return DEFAULT_STATUS_CODE;
  }
  const code = Math.round(val);
  return code >= 100 && code <= 599 ? code : DEFAULT_STATUS_CODE;
};

const toHeaders = (val: unknown): Record<string, string> => {
  if (!val || typeof val !== 'object' || Array.isArray(val)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(val)) {
    if (Object.keys(result).length >= MAX_HEADERS) {
      break;
    }
    const name = rawName.trim().toLowerCase().slice(0, MAX_HEADER_NAME_LEN);
    if (!name || !/^[!#$%&'*+\-.^_`|~0-9a-z]+$/.test(name) || typeof rawValue !== 'string') {
      continue;
    }
    result[name] = rawValue.replace(/[\r\n]+/g, ' ').slice(0, MAX_HEADER_VALUE_LEN);
  }
  return result;
};

const toFiles = (val: unknown): string[] => {
  if (!Array.isArray(val)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of val) {
    if (result.length >= MAX_FILES_PER_RULE) {
      break;
    }
    if (isSafeFileName(item) && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
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

export function sanitizeMockRules(input: unknown): MockRule[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<string>();
  const result: MockRule[] = [];
  for (const item of input) {
    if (result.length >= MAX_RULES) {
      break;
    }
    if (!item || typeof item !== 'object') {
      continue;
    }
    const raw = item as Record<string, unknown>;
    const pattern = toPattern(raw.pattern);
    const files = toFiles(raw.files);
    if (pattern === null || !files.length) {
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
      files,
      mode: toMode(raw.mode),
      type: toType(raw.type, files[0] ?? ''),
      delay: toDelay(raw.delay),
      delayJitter: toDelay(raw.delayJitter),
      hitRate: toHitRate(raw.hitRate),
      statusCode: toStatusCode(raw.statusCode),
      headers: toHeaders(raw.headers),
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
export const parseMockRules = (raw: unknown): MockRule[] => parseRules(raw, sanitizeMockRules);

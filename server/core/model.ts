/** 规则数据模型：与 UI 共享的结构定义与常量（无 IO，便于测试） */

export type SaveType = 'json' | 'text' | 'sse';
export type MockType = SaveType;
export type MockMode = 'fixed' | 'round-robin' | 'random';

export interface SaveRule {
  id: string;
  name: string;
  enabled: boolean;
  /** URL 匹配规则：子串 或 /正则/ 或 /正则/i */
  pattern: string;
  /** HTTP 方法过滤（大写），空数组 = 全部方法 */
  methods: string[];
  /** 保存目录（绝对路径） */
  dir: string;
  /** 保存哪些响应类型 */
  saveTypes: SaveType[];
  /** 响应体大小上限（KB），超过则跳过；0 = 不限 */
  maxBodyKB: number;
  /** 响应状态码过滤，例如 200-299,304；空字符串 = 全部 */
  statusCodes: string;
  /** JSON 响应保存前是否格式化 */
  prettyJson: boolean;
}

export interface MockRule {
  id: string;
  name: string;
  enabled: boolean;
  /** URL 匹配规则：子串 或 /正则/ 或 /正则/i */
  pattern: string;
  /** HTTP 方法过滤（大写），空数组 = 全部方法 */
  methods: string[];
  /** 响应文件来源目录（绝对路径） */
  dir: string;
  /** 参与 mock 的文件名列表（不含路径） */
  files: string[];
  /** fixed 恒用首个文件；round-robin 依次轮换；random 随机 */
  mode: MockMode;
  /** mock 响应类型 */
  type: MockType;
  /** SSE 推送间隔 / 普通响应延迟（ms） */
  delay: number;
  /** 在 delay 基础上增加 0..delayJitter 的随机抖动（ms） */
  delayJitter: number;
  /** Mock 命中率（1-100），用于模拟偶发回源 */
  hitRate: number;
  /** 覆盖响应状态码 */
  statusCode: number;
  /** 追加或覆盖的响应头 */
  headers: Record<string, string>;
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

export const SAVE_TYPES: SaveType[] = ['json', 'text', 'sse'];

export const MAX_RULES = 200;
export const MAX_NAME_LEN = 64;
export const MAX_PATTERN_LEN = 512;
export const MAX_DIR_LEN = 512;
export const MAX_FILES_PER_RULE = 20;
export const MAX_ID_LEN = 64;

export const DEFAULT_DELAY = 50;
export const MAX_DELAY = 5000;
export const DEFAULT_HIT_RATE = 100;
export const DEFAULT_STATUS_CODE = 200;
export const MAX_HEADERS = 30;
export const MAX_HEADER_NAME_LEN = 128;
export const MAX_HEADER_VALUE_LEN = 2048;

export const DEFAULT_MAX_BODY_KB = 0;
export const MAX_BODY_KB_LIMIT = 10240;

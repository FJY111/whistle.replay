/** 规则数据模型：与 UI 共享的结构定义与常量（无 IO，便于测试） */

export type SaveType = 'json' | 'text' | 'sse';

export interface SaveRule {
  id: string;
  name: string;
  enabled: boolean;
  /** URL 匹配规则：子串 或 /正则/ 或 /正则/i。作用于完整 URL，不是回放键 */
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

/** 回放白名单或黑名单。域名和路径都可选，但至少填一项 */
export interface ReplayRule {
  id: string;
  name: string;
  enabled: boolean;
  /** 主机名匹配：子串 或 /正则/ 或 /正则/i。空字符串表示任意域名 */
  host: string;
  /** pathname 匹配：子串 或 /正则/ 或 /正则/i。空字符串表示任意路径 */
  pattern: string;
  /** HTTP 方法过滤（大写），空数组 = 全部方法 */
  methods: string[];
}

/** 一份可回放的抓包记录（响应体在独立文件里） */
export interface CaptureMeta {
  url: string;
  pathname: string;
  method: string;
  time: number;
  statusCode: number;
  contentType: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  /** 请求体是二进制或超过可写入上限 */
  requestBodyOmitted: boolean;
  responseHeaders: Record<string, string>;
}

export interface ReplayEntry extends CaptureMeta {
  file: string;
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

export const SAVE_TYPES: SaveType[] = ['json', 'text', 'sse'];

export const MAX_RULES = 200;
export const MAX_NAME_LEN = 64;
export const MAX_PATTERN_LEN = 512;
export const MAX_DIR_LEN = 512;
export const MAX_ID_LEN = 64;

export const DEFAULT_MAX_BODY_KB = 0;
export const MAX_BODY_KB_LIMIT = 10240;

export const MAX_CAPTURE_HEADERS = 100;
export const MAX_HEADER_NAME_LEN = 128;
export const MAX_HEADER_VALUE_LEN = 8192;

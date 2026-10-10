import type { CaptureMeta, ExcludeRule, SaveRule } from '../server/core/model.ts';

export type { CaptureMeta, ExcludeRule, SaveRule, SaveType } from '../server/core/model.ts';
export { HTTP_METHODS } from '../server/core/model.ts';

export interface Settings {
  ec: number;
  em?: string;
  saveActive: boolean;
  saveRules: SaveRule[];
  excludeRules: ExcludeRule[];
}

export interface FileInfo {
  name: string;
  size: number;
  mtime: number;
  url?: string;
  contentType?: string;
  method?: string;
  pathname?: string;
  statusCode?: number;
}

export interface ListFilesResult {
  ec: number;
  dir: string;
  files: FileInfo[];
}

export interface ReadFileResult {
  ec: number;
  em?: string;
  name?: string;
  size?: number;
  truncated?: boolean;
  content?: string;
  meta?: CaptureMeta;
}

export interface WriteFileResult {
  ec: number;
  em?: string;
  name?: string;
  size?: number;
  mtime?: number;
}

export interface RulesResult {
  ec: number;
  em?: string;
}

export const genId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

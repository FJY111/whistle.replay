import type { Context } from 'koa';

import fs from 'node:fs';
import path from 'node:path';

import { readMeta } from '../../core/metaStore';
import { findReplayByFile } from '../../core/replayStore';

const FILE_RE = /\.(json|txt)$/i;
const MAX_FILES = 200;

interface FileInfo {
  name: string;
  size: number;
  mtime: number;
  url?: string;
  contentType?: string;
  method?: string;
  pathname?: string;
  statusCode?: number;
}

const statFile = (dir: string, name: string): Promise<FileInfo | null> =>
  new Promise((resolve) => {
    fs.stat(path.join(dir, name), (err, stat) => {
      if (err || !stat.isFile()) {
        resolve(null);
        return;
      }
      resolve({ name, size: stat.size, mtime: Math.round(stat.mtimeMs) });
    });
  });

/** 扫描指定目录，返回已保存的响应文件（合并索引或回放目录中的来源信息） */
async function listFiles(ctx: Context): Promise<void> {
  const dir = typeof ctx.query.dir === 'string' ? ctx.query.dir : '';
  if (!dir) {
    ctx.body = { ec: 0, dir: '', files: [] };
    return;
  }
  const names = await new Promise<string[]>((resolve) => {
    fs.readdir(dir, (err, list) => {
      resolve(err ? [] : list.filter((name) => FILE_RE.test(name) && !name.startsWith('.')));
    });
  });
  const stats = await Promise.all(names.map((name) => statFile(dir, name)));
  const meta = readMeta(dir);
  const files = stats
    .filter((info): info is FileInfo => info !== null)
    .map((info) => {
      const saved = meta[info.name] ?? findReplayByFile(dir, info.name) ?? undefined;
      return {
        ...info,
        url: saved?.url,
        contentType: saved?.contentType,
        method: saved?.method,
        pathname: saved?.pathname,
        statusCode: saved?.statusCode,
      };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, MAX_FILES);
  ctx.body = { ec: 0, dir, files };
}

export = listFiles;

import type { Context } from 'koa';

import fs from 'node:fs';
import path from 'node:path';

import { isSafeFileName } from '../../core/sanitize';
import { getConfiguredDirs } from '../../core/settings';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

interface WriteFileBody {
  dir?: unknown;
  file?: unknown;
  content?: unknown;
}

/** 覆盖已有响应文件；仅允许编辑规则配置目录中的 json/txt 文件 */
async function writeFile(ctx: Context): Promise<void> {
  const body = ctx.request.body as WriteFileBody;
  const dir = typeof body.dir === 'string' ? body.dir : '';
  const name = typeof body.file === 'string' ? body.file : '';
  const content = typeof body.content === 'string' ? body.content : null;

  if (!dir || !isSafeFileName(name) || !getConfiguredDirs(ctx.req.localStorage).includes(dir)) {
    ctx.body = { ec: 2, em: '非法的文件路径' };
    return;
  }
  if (content === null) {
    ctx.body = { ec: 3, em: '文件内容格式错误' };
    return;
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE) {
    ctx.body = { ec: 4, em: '文件内容不能超过 4 MB' };
    return;
  }

  const filePath = path.join(dir, name);
  const stat = await new Promise<fs.Stats | null>((resolve) => {
    fs.lstat(filePath, (err, value) => {
      resolve(err ? null : value);
    });
  });
  if (!stat?.isFile()) {
    ctx.body = { ec: 5, em: '文件不存在或不是普通文件' };
    return;
  }

  const saved = await new Promise<boolean>((resolve) => {
    fs.writeFile(filePath, content, 'utf8', (err) => {
      resolve(!err);
    });
  });
  if (!saved) {
    ctx.body = { ec: 6, em: '文件保存失败' };
    return;
  }

  ctx.body = {
    ec: 0,
    name,
    size: Buffer.byteLength(content, 'utf8'),
    mtime: Date.now(),
  };
}

export = writeFile;

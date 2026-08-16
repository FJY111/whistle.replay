import type { Context } from 'koa';

import fs from 'node:fs';
import path from 'node:path';

import { isSafeFileName } from '../../core/sanitize';
import { getConfiguredDirs } from '../../core/settings';

/** 预览内容大小上限 */
const MAX_PREVIEW = 256 * 1024;

/** 读取保存目录内的响应文件内容（用于界面预览，dir 必须是规则中配置过的目录） */
async function readFile(ctx: Context): Promise<void> {
  const dir = typeof ctx.query.dir === 'string' ? ctx.query.dir : '';
  const name = typeof ctx.query.file === 'string' ? ctx.query.file : '';
  if (!dir || !isSafeFileName(name) || !getConfiguredDirs(ctx.req.localStorage).includes(dir)) {
    ctx.body = { ec: 2, em: '非法的文件路径' };
    return;
  }
  const filePath = path.join(dir, name);
  const body = await new Promise<string | null>((resolve) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      resolve(err ? null : data);
    });
  });
  if (body === null) {
    ctx.body = { ec: 3, em: '文件读取失败' };
    return;
  }
  const truncated = body.length > MAX_PREVIEW;
  ctx.body = {
    ec: 0,
    name,
    size: body.length,
    truncated,
    content: truncated ? body.slice(0, MAX_PREVIEW) : body,
  };
}

export = readFile;

import type { Context } from 'koa';

import { deleteSavedCapture } from '../../core/replayStore';
import { isSafeFileName } from '../../core/sanitize';
import { getConfiguredDirs } from '../../core/settings';

interface DeleteBody {
  dir?: string;
  file?: string;
}

/** 删除响应文件，以及展示索引和回放记录里的对应条目 */
function deleteCapture(ctx: Context): void {
  const body = ctx.request.body as DeleteBody;
  const dir = body.dir ?? '';
  const file = body.file ?? '';
  if (!isSafeFileName(file) || !getConfiguredDirs(ctx.req.localStorage).includes(dir)) {
    ctx.body = { ec: 2, em: '非法的文件路径' };
    return;
  }
  deleteSavedCapture(dir, file);
  ctx.body = { ec: 0 };
}

export = deleteCapture;

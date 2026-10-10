import type { Context } from 'koa';

import { setReplaySkipped } from '../../core/replayStore';
import { isSafeFileName } from '../../core/sanitize';
import { getConfiguredDirs } from '../../core/settings';

interface SkipBody {
  dir?: string;
  file?: string;
  skip?: string;
}

/** 在回放记录上标记不回放，不改黑名单，也不删文件 */
function setCaptureSkip(ctx: Context): void {
  const body = ctx.request.body as SkipBody;
  const dir = body.dir ?? '';
  const file = body.file ?? '';
  if (!isSafeFileName(file) || !getConfiguredDirs(ctx.req.localStorage).includes(dir)) {
    ctx.body = { ec: 2, em: '非法的文件路径' };
    return;
  }
  const skip = body.skip === '1';
  if (!setReplaySkipped(dir, file, skip)) {
    ctx.body = { ec: 3, em: '这条不在回放记录里' };
    return;
  }
  ctx.body = { ec: 0, skip };
}

export = setCaptureSkip;

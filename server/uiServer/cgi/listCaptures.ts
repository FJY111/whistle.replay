import type { Context } from 'koa';

import fs from 'node:fs';
import path from 'node:path';

import { readMeta } from '../../core/metaStore';
import { listSavedCaptures } from '../../core/replayCatalog';
import { readReplay } from '../../core/replayStore';
import { getSaveDirs } from '../../core/settings';

/** 已保存流量：回放记录全部返回，并带上索引里多出来的文件 */
function listCaptures(ctx: Context): void {
  const dirs = getSaveDirs(ctx.req.localStorage);
  const captures = listSavedCaptures(
    dirs.map((dir, order) => ({
      dir,
      order,
      replay: readReplay(dir),
      index: readMeta(dir),
    })),
    (dir, file) => fs.existsSync(path.join(dir, file)),
  );
  ctx.body = { ec: 0, captures };
}

export = listCaptures;

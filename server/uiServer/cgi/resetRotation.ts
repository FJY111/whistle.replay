import type { Context } from 'koa';

import { resetRotation } from '../../core/rotation';

interface ResetBody {
  ruleId?: unknown;
}

function resetRotationCgi(ctx: Context): void {
  const body = ctx.request.body as ResetBody;
  const ruleId = typeof body.ruleId === 'string' && body.ruleId ? body.ruleId : undefined;
  resetRotation(ruleId);
  ctx.body = { ec: 0, ruleId: ruleId ?? null };
}

export = resetRotationCgi;

import type { Context } from 'koa';

interface ActiveBody {
  active?: string;
  /** save：保存开关。replay：回放开关 */
  type?: string;
}

function setActive(ctx: Context): void {
  const { localStorage } = ctx.req;
  const body = ctx.request.body as ActiveBody;
  const isActive = body.active === '1';
  if (body.type === 'replay') {
    localStorage.setProperty('replayActive', isActive);
    ctx.body = { ec: 0, active: isActive };
    return;
  }
  if (body.type != null && body.type !== '' && body.type !== 'save') {
    ctx.body = { ec: 0, active: localStorage.getProperty('saveActive') === true };
    return;
  }
  localStorage.setProperty('saveActive', isActive);
  ctx.body = { ec: 0, active: isActive };
}

export = setActive;

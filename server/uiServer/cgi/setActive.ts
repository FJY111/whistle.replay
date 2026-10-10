import type { Context } from 'koa';

interface ActiveBody {
  active?: string;
  /** save：自动保存开关。回放没有总开关 */
  type?: string;
}

function setActive(ctx: Context): void {
  const { localStorage } = ctx.req;
  const body = ctx.request.body as ActiveBody;
  if (body.type !== 'save' && body.type != null && body.type !== '') {
    ctx.body = { ec: 0, active: localStorage.getProperty('saveActive') === true };
    return;
  }
  const isActive = body.active === '1';
  localStorage.setProperty('saveActive', isActive);
  ctx.body = { ec: 0, active: isActive };
}

export = setActive;

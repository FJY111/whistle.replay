import type { Context } from 'koa';

interface ActiveBody {
  active?: string;
  /** save（自动保存开关） | mock（本地 mock 开关） */
  type?: string;
}

function setActive(ctx: Context): void {
  const { localStorage } = ctx.req;
  const body = ctx.request.body as ActiveBody;
  const isActive = body.active === '1';
  const key = body.type === 'mock' ? 'mockActive' : 'saveActive';
  localStorage.setProperty(key, isActive);
  ctx.body = { ec: 0, active: isActive };
}

export = setActive;

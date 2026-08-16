import type { Context } from 'koa';

import { parseMockRules, parseSaveRules } from '../../core/sanitize';

function getSettings(ctx: Context): void {
  const { localStorage } = ctx.req;
  ctx.body = {
    ec: 0,
    saveActive: localStorage.getProperty('saveActive') === true,
    saveRules: parseSaveRules(localStorage.getProperty('saveRules')),
    mockActive: localStorage.getProperty('mockActive') === true,
    mockRules: parseMockRules(localStorage.getProperty('mockRules')),
  };
}

export = getSettings;

import type { Context } from 'koa';

import { parseExcludeRules, parseSaveRules } from '../../core/sanitize';

function getSettings(ctx: Context): void {
  const { localStorage } = ctx.req;
  ctx.body = {
    ec: 0,
    saveActive: localStorage.getProperty('saveActive') === true,
    saveRules: parseSaveRules(localStorage.getProperty('saveRules')),
    excludeRules: parseExcludeRules(localStorage.getProperty('excludeRules')),
  };
}

export = getSettings;

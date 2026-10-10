import type { Context } from 'koa';

import { isReplayActive } from '../../core/replayAllow';
import { parseBlockRules, parseReplayRules, parseSaveRules } from '../../core/sanitize';

function getSettings(ctx: Context): void {
  const { localStorage } = ctx.req;
  ctx.body = {
    ec: 0,
    saveActive: localStorage.getProperty('saveActive') === true,
    saveRules: parseSaveRules(localStorage.getProperty('saveRules')),
    replayActive: isReplayActive(localStorage.getProperty('replayActive')),
    replayRules: parseReplayRules(localStorage.getProperty('replayRules')),
    blockRules: parseBlockRules(localStorage.getProperty('blockRules')),
  };
}

export = getSettings;

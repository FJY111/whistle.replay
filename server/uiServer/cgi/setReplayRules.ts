import type { Context } from 'koa';

import { sanitizeReplayRules } from '../../core/sanitize';

interface RulesBody {
  rules?: unknown;
}

/** 需要回放的白名单（JSON 字符串提交，服务端统一清洗） */
function setReplayRules(ctx: Context): void {
  const body = ctx.request.body as RulesBody;
  let parsed: unknown = [];
  if (typeof body.rules === 'string' && body.rules) {
    try {
      parsed = JSON.parse(body.rules);
    } catch {
      ctx.body = { ec: 2, em: '规则数据格式错误' };
      return;
    }
  }
  const rules = sanitizeReplayRules(parsed);
  ctx.req.localStorage.setProperty('replayRules', JSON.stringify(rules));
  ctx.body = { ec: 0, rules };
}

export = setReplayRules;

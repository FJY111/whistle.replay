import type { Context } from 'koa';

import { sanitizeExcludeRules } from '../../core/sanitize';

interface RulesBody {
  rules?: unknown;
}

/** 排除规则：命中后不回放（JSON 字符串提交，服务端统一清洗） */
function setExcludeRules(ctx: Context): void {
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
  const rules = sanitizeExcludeRules(parsed);
  ctx.req.localStorage.setProperty('excludeRules', JSON.stringify(rules));
  ctx.body = { ec: 0, rules };
}

export = setExcludeRules;

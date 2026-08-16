import type { Context } from 'koa';

import { checkDirs } from './util';

import { sanitizeSaveRules } from '../../core/sanitize';

interface RulesBody {
  rules?: unknown;
}

/** 保存规则列表（JSON 字符串形式提交，服务端统一清洗校验） */
async function setSaveRules(ctx: Context): Promise<void> {
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
  const rules = sanitizeSaveRules(parsed);
  const err = await checkDirs(rules.filter((rule) => rule.enabled).map((rule) => rule.dir));
  if (err) {
    ctx.body = err;
    return;
  }
  ctx.req.localStorage.setProperty('saveRules', JSON.stringify(rules));
  ctx.body = { ec: 0, rules };
}

export = setSaveRules;

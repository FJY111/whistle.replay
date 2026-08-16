/** URL 与 HTTP 方法匹配（纯函数） */

const REG_EXP_RE = /^\/(.+)\/(i)?$/;

/** URL 是否命中匹配规则：子串 或 /正则/ 或 /正则/i */
export function testPattern(url: string, pattern: string): boolean {
  const p = typeof pattern === 'string' ? pattern.trim() : '';
  if (!p || !url) {
    return false;
  }
  const matched = REG_EXP_RE.exec(p);
  if (matched) {
    try {
      return new RegExp(matched[1] ?? '', matched[2] ?? '').test(url);
    } catch {
      return false;
    }
  }
  return url.includes(p);
}

/** 请求方法是否命中规则的方法过滤：methods 为空表示全部方法 */
export function testMethod(reqMethod: string | undefined, methods: string[]): boolean {
  if (!methods.length) {
    return true;
  }
  if (!reqMethod) {
    return false;
  }
  return methods.includes(reqMethod.toUpperCase());
}

/** 校验 pattern 是否合法（子串恒合法，/正则/ 需可编译） */
export function isValidPattern(pattern: string): boolean {
  const p = typeof pattern === 'string' ? pattern.trim() : '';
  if (!p) {
    return false;
  }
  const matched = REG_EXP_RE.exec(p);
  if (!matched) {
    return true;
  }
  try {
    new RegExp(matched[1] ?? '', matched[2] ?? '');
    return true;
  } catch {
    return false;
  }
}

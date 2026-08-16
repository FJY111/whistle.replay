/** HTTP 状态码过滤表达式，例如 "200-299,304,404" */

const TOKEN_RE = /^(\d{3})(?:\s*-\s*(\d{3}))?$/;

export function normalizeStatusCodes(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  const result: string[] = [];
  for (const raw of input.split(',')) {
    const token = raw.trim();
    if (!token) {
      continue;
    }
    const matched = TOKEN_RE.exec(token);
    if (!matched) {
      continue;
    }
    const start = Number(matched[1]);
    const end = Number(matched[2] ?? matched[1]);
    if (start < 100 || start > 599 || end < start || end > 599) {
      continue;
    }
    const normalized = start === end ? String(start) : `${String(start)}-${String(end)}`;
    if (!result.includes(normalized)) {
      result.push(normalized);
    }
  }
  return result.join(',');
}

export function isValidStatusCodes(input: string): boolean {
  const value = input.trim();
  if (!value) {
    return true;
  }
  return (
    value.split(',').filter((item) => item.trim()).length ===
    normalizeStatusCodes(value).split(',').filter(Boolean).length
  );
}

export function testStatusCode(statusCode: number | undefined, expression: string): boolean {
  if (!expression) {
    return true;
  }
  if (!statusCode) {
    return false;
  }
  return expression.split(',').some((token) => {
    const matched = TOKEN_RE.exec(token);
    if (!matched) {
      return false;
    }
    const start = Number(matched[1]);
    const end = Number(matched[2] ?? matched[1]);
    return statusCode >= start && statusCode <= end;
  });
}

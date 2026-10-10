/** 把一条回放记录变成 whistle 动态规则 */

export interface BuiltRule {
  rules: string;
  values: Record<string, string>;
}

/** 一次性回放。路径含空白或 > 时把正文放进规则值 */
export function buildFileReplay(
  requestUrl: string,
  filePath: string,
  statusCode: number,
  headers: Record<string, string>,
  inlineBody: string | null,
): BuiltRule {
  const statusRule = ` statusCode://${String(statusCode)}`;
  const headerJson = JSON.stringify(headers);
  if (inlineBody !== null) {
    return {
      rules: `${requestUrl} file://{sakeReplayBody} resHeaders://{sakeReplayH}${statusRule}`,
      values: { sakeReplayBody: inlineBody, sakeReplayH: headerJson },
    };
  }
  return {
    rules: `${requestUrl} file://<${filePath}> resHeaders://{sakeReplayH}${statusRule}`,
    values: { sakeReplayH: headerJson },
  };
}

export function buildSseReplay(
  requestUrl: string,
  streamUrl: string,
  statusCode: number,
): BuiltRule {
  return {
    rules: `${requestUrl} ${streamUrl} statusCode://${String(statusCode)}`,
    values: {},
  };
}

/** 把保存的 SSE/文本内容切分为可逐段推送的分片（每个分片保留原始分隔符） */

const BOUNDARY_RE = /\r?\n\r?\n/;
const EVENT_RE = /[\s\S]*?\r?\n\r?\n/g;
const LINE_RE = /[^\n]*\n|[^\n]+/g;

export function splitSseEvents(body: string): string[] {
  if (!body) {
    return [];
  }
  if (!BOUNDARY_RE.test(body)) {
    return body.match(LINE_RE) ?? [];
  }
  const events: string[] = [];
  let lastIndex = 0;
  let matched: RegExpExecArray | null;
  EVENT_RE.lastIndex = 0;
  while ((matched = EVENT_RE.exec(body)) !== null) {
    events.push(matched[0]);
    lastIndex = EVENT_RE.lastIndex;
  }
  const rest = body.slice(lastIndex);
  if (rest) {
    events.push(rest);
  }
  return events;
}

/** whistle 抓包帧（SSE 会按事件拆成 frame，分隔符默认不保留） */
export interface SseFrame {
  body?: string | Buffer | null;
  isClient?: boolean;
  closed?: boolean;
  err?: unknown;
}

/**
 * 把 whistle SSE frames 还原为可保存/回放的文本。
 * whistle 默认按 `\n\n` 切分且不保留分隔符，因此用 `\n\n` 重新拼接。
 */
export function joinSseFrames(frames: SseFrame[]): string {
  const chunks: string[] = [];
  for (const frame of frames) {
    if (frame.isClient) {
      continue;
    }
    if (frame.body == null || frame.body === '') {
      continue;
    }
    chunks.push(Buffer.isBuffer(frame.body) ? frame.body.toString('utf8') : frame.body);
  }
  return chunks.join('\n\n');
}

/**
 * 与后端 FastAPI 的 SSE 接口 (POST /api/chat/stream) 通信。
 *
 * 因为 EventSource 只支持 GET,所以这里用 fetch + ReadableStream 手动解析
 * `data: ...\n\n` 格式的 SSE。
 *
 * 后端事件格式:
 *   data: {"content": "分块文本"}\n\n
 *   data: {"content": "再一块"}\n\n
 *   data: [DONE]\n\n
 *
 * 错误:
 *   data: {"error": "错误描述"}\n\n
 *   data: [DONE]\n\n
 */

export interface StreamHandlers {
  /** 每收到一块 content 时触发,text 是累计的 delta */
  onDelta: (delta: string) => void;
  /** 结束时触发(无论是正常 [DONE] 还是错误后的 [DONE]) */
  onDone: () => void;
  /** 出错时触发,err 是后端回的 error 字段或本地抛的异常 */
  onError: (err: string) => void;
  /** 外部终止信号 */
  signal?: AbortSignal;
}

export async function streamChat(query: string, handlers: StreamHandlers): Promise<void> {
  const { onDelta, onDone, onError, signal } = handlers;

  try {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ query }),
      signal,
    });

    if (!res.ok || !res.body) {
      onError(`请求失败: HTTP ${res.status}`);
      onDone();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    // 持续读取字节流,按 \n\n 分割事件,再从 data: 行里取 JSON
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE 以空行 (\n\n) 作为事件分隔符
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        // 一个事件可能有多行,只处理 data: 开头的行
        const dataLines = rawEvent
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart());

        if (dataLines.length === 0) continue;
        const payload = dataLines.join('\n');

        if (payload === '[DONE]') {
          onDone();
          return;
        }

        try {
          const obj = JSON.parse(payload);
          if (typeof obj.error === 'string') {
            onError(obj.error);
          } else if (typeof obj.content === 'string') {
            onDelta(obj.content);
          }
        } catch {
          // 非 JSON 的 data 一般不会出现,忽略即可
        }
      }
    }

    // 流自然结束但没见到 [DONE],也算完成
    onDone();
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      // 用户主动取消,不当作错误
      onDone();
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    onError(`连接后端失败: ${msg}`);
    onDone();
  }
}

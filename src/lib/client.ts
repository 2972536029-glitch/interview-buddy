// 仅客户端使用的工具函数
export function newId(): string {
  return crypto.randomUUID();
}

/** POST 并逐段读取纯文本流;返回完整文本。onChunk 在每个增量到达时被调用。
 * 无增量超过 idleTimeoutMs 自动中断(防止上游挂死导致界面永远等待) */
export async function streamText(
  url: string,
  body: unknown,
  onChunk: (t: string) => void,
  idleTimeoutMs = 120000
): Promise<string> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const arm = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), idleTimeoutMs);
  };
  arm();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    if (timer) clearTimeout(timer);
    throw new Error(`请求超时或网络中断(${Math.round(idleTimeoutMs / 1000)} 秒无响应),请重试`);
  }
  if (!res.ok) {
    if (timer) clearTimeout(timer);
    const t = await res.text().catch(() => "");
    throw new Error(t ? t.slice(0, 200) : `HTTP ${res.status}`);
  }
  if (!res.body) {
    if (timer) clearTimeout(timer);
    throw new Error("响应无内容");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      arm(); // 收到增量,重置空闲计时
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      onChunk(chunk);
    }
  } catch {
    throw new Error(`流式传输中断(${Math.round(idleTimeoutMs / 1000)} 秒无增量),请重试`);
  } finally {
    if (timer) clearTimeout(timer);
  }
  return full;
}

/** 普通POST JSON */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  if (data === null) throw new Error("响应不是 JSON");
  return data;
}

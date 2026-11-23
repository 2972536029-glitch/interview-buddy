// 服务端多模型客户端:智谱 GLM(服务端 key)+ DeepSeek(用户自备 key,BYOK)。
// 流式对话 + JSON 调用(重试 1 次 + 降级)。key 只在服务端进程内读取,永不写入任何文件、日志或前端代码。
import fs from "node:fs";
import { findModel } from "./models";

const API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export const GLM_MODEL = process.env.GLM_MODEL || "glm-4.5-flash";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 服务端读取 API key:环境变量 GLM_API_KEY,或读取 GLM_KEY_FILE 指向的本机 key 文件 */
export function getApiKey(): string | null {
  if (process.env.GLM_API_KEY) return process.env.GLM_API_KEY;
  const file = process.env.GLM_KEY_FILE;
  if (!file) return null;
  try {
    return fs.readFileSync(file, "utf8").trim() || null;
  } catch {
    return null;
  }
}

/** 请求级模型选项:model 不传 = 服务端默认;DeepSeek 需用户自备 key 随请求携带 */
export interface ModelOpts {
  modelId?: string;
  byokKey?: string;
}

interface UpstreamFetchArgs extends ModelOpts {
  body: Record<string, unknown>;
}

async function upstreamFetch(args: UpstreamFetchArgs): Promise<Response> {
  const id = args.modelId || GLM_MODEL;
  const entry = findModel(id);
  if (!entry) throw new Error(`未知模型:${id}(不在模型目录中)`);
  if (entry.provider === "deepseek") {
    const key = (args.byokKey || "").trim();
    if (!key) throw new Error("使用 DeepSeek 模型需要先在「设置」里填写你自己的 DeepSeek API Key");
    return fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(args.body),
    });
  }
  const key = getApiKey();
  if (!key) throw new Error("未配置 GLM API key(设 GLM_API_KEY 环境变量或检查本机 token 文件)");
  return fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args.body),
  });
}

/**
 * 流式对话:把 GLM 的 SSE 流转换成纯文本增量流。
 * 过滤 reasoning_content(思考字段),只放行正文 content。
 */
export async function openStreamChat(
  messages: LlmMessage[],
  temperature = 0.85,
  opts: ModelOpts = {}
): Promise<ReadableStream<Uint8Array>> {
  const id = opts.modelId || GLM_MODEL;
  const entry = findModel(id);
  if (!entry) throw new Error(`未知模型:${id}(不在模型目录中)`);
  const body: Record<string, unknown> = {
    model: id,
    messages,
    stream: true,
    temperature,
    // 智谱与 DeepSeek V4 使用同名思考开关参数;关思考保证面试官对话首响快
    // (DeepSeek 思考模式的推理内容走 reasoning_content 字段,流转换器本来就会过滤)
    thinking: { type: "disabled" },
  };
  const upstream = await upstreamFetch({ body, ...opts });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    throw new Error(`大模型接口错误 ${upstream.status}: ${detail.slice(0, 200)}`);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";

  return upstream.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        buf += decoder.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: unknown } }>;
            };
            const content = j.choices?.[0]?.delta?.content;
            if (typeof content === "string" && content.length > 0) {
              controller.enqueue(encoder.encode(content));
            }
          } catch {
            // 单行 SSE 解析失败跳过,不中断整个流
          }
        }
      },
    })
  );
}

/** 从模型输出里抠出第一个完整 JSON 对象并校验;失败返回 null */
function extractJson<T>(text: string, validate?: (d: unknown) => T | null): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    if (validate) return validate(parsed);
    return parsed as T;
  } catch {
    return null;
  }
}

/** 非流式补全,返回原始文本;jsonMode=true 时带 response_format(不支持时自动退回) */
async function rawCompletion(
  messages: LlmMessage[],
  jsonMode: boolean,
  opts: ModelOpts = {}
): Promise<string> {
  const id = opts.modelId || GLM_MODEL;
  const entry = findModel(id);
  if (!entry) throw new Error(`未知模型:${id}(不在模型目录中)`);
  const buildBody = (withJson: boolean): Record<string, unknown> => {
    const b: Record<string, unknown> = {
      model: id,
      messages,
      temperature: 0.3,
      // 思考开关参数智谱/DeepSeek 同名;JSON 任务关思考保速度,质量由重试机制兜底
      thinking: { type: "disabled" },
    };
    if (withJson) b.response_format = { type: "json_object" };
    return b;
  };

  let res = await upstreamFetch({ body: buildBody(jsonMode), ...opts });
  if (res.status === 400) {
    const t = await res.text().catch(() => "");
    if (t.includes("response_format")) {
      // 模型不支持 JSON mode:退回普通模式重发
      res = await upstreamFetch({ body: buildBody(false), ...opts });
    } else {
      throw new Error(`大模型接口错误 400: ${t.slice(0, 200)}`);
    }
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`大模型接口错误 ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = (await res.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = j.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("大模型返回缺少 content");
  return content;
}

export interface JsonCallResult<T> {
  data: T | null;
  raw: string;
  parsed: boolean;
}

/** JSON 调用:解析失败自动重试 1 次;再失败降级返回原文(parsed=false),由调用方标注"解析失败" */
export async function callJson<T>(
  messages: LlmMessage[],
  validate?: (d: unknown) => T | null,
  opts: ModelOpts = {}
): Promise<JsonCallResult<T>> {
  let lastRaw = "";
  let convo: LlmMessage[] = [...messages];
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await rawCompletion(convo, true, opts);
    lastRaw = raw;
    const data = extractJson(raw, validate);
    if (data !== null) return { data, raw, parsed: true };
    convo = [
      ...messages,
      { role: "assistant", content: raw },
      {
        role: "user",
        content: "上面的输出不是合法 JSON 或字段不符合要求。重新输出:只输出合法 JSON,不要 markdown 代码块,不要任何其他文字。",
      },
    ];
  }
  return { data: null, raw: lastRaw, parsed: false };
}

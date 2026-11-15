// 模型目录与设置(客户端设置页 + 服务端路由共用)
// BYOK 模式:智谱模型用服务端配置的 key;DeepSeek 模型用用户自备 key(存浏览器 localStorage,
// 仅随单次请求转发给服务端,不写入任何服务端文件)。

export type ModelProvider = "zhipu" | "deepseek";

export interface ModelEntry {
  id: string;
  label: string;
  vendor: string;
  provider: ModelProvider;
  price: string;
  desc: string;
}

export const MODEL_CATALOG: ReadonlyArray<ModelEntry> = [
  {
    id: "glm-4.5-flash",
    label: "GLM-4.5-Flash",
    vendor: "智谱",
    provider: "zhipu",
    price: "免费",
    desc: "默认模型,速度快、零成本;日常练习够用",
  },
  {
    id: "glm-4.6",
    label: "GLM-4.6",
    vendor: "智谱",
    provider: "zhipu",
    price: "付费(智谱 key 按量计费)",
    desc: "旗舰档:长文本理解与 JSON 稳定性更强,点评/诊断质量更高",
  },
  {
    id: "deepseek-flash",
    label: "DeepSeek-V4.1 Flash",
    vendor: "DeepSeek",
    provider: "deepseek",
    price: "付费(需自备 DeepSeek Key)",
    desc: "V4.1 轻量快档,1M 上下文;支持视觉;需在下方填入你自己的 DeepSeek API Key",
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek-V4 Pro",
    vendor: "DeepSeek",
    provider: "deepseek",
    price: "付费(需自备 DeepSeek Key)",
    desc: "V4 旗舰,理解与推理更强;需在下方填入你自己的 DeepSeek API Key",
  },
];

// 旧模型名兼容(2026-07 已弃用的别名仍可能存在于用户本地设置里)
const MODEL_ALIASES: Record<string, string> = {
  "deepseek-chat": "deepseek-flash",
  "deepseek-reasoner": "deepseek-v4-pro",
};

export function findModel(id: string | undefined): ModelEntry | null {
  if (!id) return null;
  const resolved = MODEL_ALIASES[id] ?? id;
  return MODEL_CATALOG.find((m) => m.id === resolved) ?? null;
}

export function modelLabel(id: string | undefined): string {
  return findModel(id)?.label ?? "服务端默认";
}

export interface AppSettings {
  /** MODEL_CATALOG 里的 id;空 = 服务端默认 */
  modelId: string;
  /** BYOK:DeepSeek 模型的用户自备 key(只存浏览器 localStorage) */
  deepseekKey?: string;
}

const SETTINGS_KEY = "mdz.settings.v1";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { modelId: "" };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { modelId: "" };
    const s = JSON.parse(raw) as AppSettings;
    return { modelId: typeof s.modelId === "string" ? s.modelId : "", deepseekKey: typeof s.deepseekKey === "string" ? s.deepseekKey : undefined };
  } catch {
    return { modelId: "" };
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/** 随请求带给服务端的模型参数(空 modelId = 跟随服务端默认,不传字段) */
export function settingsPayload(): { model?: string; byokKey?: string } {
  const s = loadSettings();
  if (!s.modelId) return {};
  const out: { model?: string; byokKey?: string } = { model: s.modelId };
  if (s.deepseekKey) out.byokKey = s.deepseekKey;
  return out;
}

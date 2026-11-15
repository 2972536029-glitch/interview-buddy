"use client";

import { useEffect, useState } from "react";
import { MODEL_CATALOG, loadSettings, saveSettings } from "@/lib/models";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [modelId, setModelId] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setModelId(s.modelId);
    setDeepseekKey(s.deepseekKey ?? "");
    setMounted(true);
  }, []);

  function handleSave() {
    saveSettings({
      modelId,
      deepseekKey: deepseekKey.trim() ? deepseekKey.trim() : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">设置</h1>
        <p className="mt-1 text-sm text-slate-500">
          模型选择立即生效,设置只保存在本机浏览器(localStorage)。
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-bold">面试官 / 诊断模型</h2>
        <div className="mt-3 space-y-2">
          {MODEL_CATALOG.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModelId(m.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                modelId === m.id
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{m.label}</span>
                <span
                  className={`text-xs ${
                    m.provider === "deepseek" ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {m.price}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{m.desc}</p>
            </button>
          ))}
        </div>

        {modelId.startsWith("deepseek") && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              使用 DeepSeek 模型需要你自己的 API Key
            </p>
            <p className="mt-1 text-xs text-amber-700">
              到 platform.deepseek.com 申请,费用由你的 DeepSeek 账户承担。Key 只保存在本机
              浏览器,随请求转发给服务端调用,不写入任何服务器存储。
            </p>
            <input
              type="password"
              value={deepseekKey}
              onChange={(e) => setDeepseekKey(e.target.value)}
              placeholder="粘贴 DeepSeek API Key(sk-…)"
              className="mt-2 w-full rounded-lg border border-amber-300 p-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
          >
            保存设置
          </button>
          {saved && <span className="text-sm text-emerald-600">已保存,立即生效</span>}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 text-xs leading-relaxed text-slate-500 shadow-sm">
        <p className="font-semibold text-slate-600">关于模型与费用</p>
        <p className="mt-1">
          · 智谱模型(GLM)使用服务端配置的 key,选付费模型时费用计入服务端账户;
          DeepSeek 采用 BYOK(自带 Key),费用计入你自己的 DeepSeek 账户。
        </p>
        <p className="mt-1">
          · 图片简历 OCR 固定使用免费的 glm-4v-flash,不随此项切换(DeepSeek 暂无视觉模型)。
        </p>
      </section>
    </div>
  );
}

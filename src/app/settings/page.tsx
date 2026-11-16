"use client";

import { useEffect, useState } from "react";
import { MODEL_CATALOG, loadSettings, saveSettings } from "@/lib/models";
import { Check } from "@/components/icons";
import DataBackupCard from "@/components/DataBackupCard";

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
    <div className="page-enter mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">设置</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          模型选择立即生效,设置只保存在本机浏览器(localStorage)。
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="font-bold">面试官 / 诊断模型</h2>
        <div className="mt-3 space-y-2">
          {MODEL_CATALOG.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModelId(m.id)}
              className={`relative w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                modelId === m.id
                  ? "border-primary bg-primary-soft ring-1 ring-primary"
                  : "border-line bg-surface hover:border-primary/40"
              }`}
            >
              {/* 选中态对勾角标(与首页一致) */}
              {modelId === m.id && (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <div className="flex items-center justify-between gap-2 pr-7">
                <span className="font-semibold">{m.label}</span>
                {/* 价格标签 pill */}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    m.provider === "deepseek" ? "bg-warn-soft text-warn" : "bg-success-soft text-success"
                  }`}
                >
                  {m.price}
                </span>
              </div>
              <p className="mt-1 pr-7 text-xs text-ink-secondary">{m.desc}</p>
            </button>
          ))}
        </div>

        {modelId.startsWith("deepseek") && (
          <div className="fade-in mt-4 rounded-xl border border-warn/40 bg-warn-soft p-4">
            <p className="text-sm font-semibold text-warn">
              使用 DeepSeek 模型需要你自己的 API Key
            </p>
            <p className="mt-1 text-xs text-warn/90">
              到 platform.deepseek.com 申请,费用由你的 DeepSeek 账户承担。Key 只保存在本机
              浏览器,随请求转发给服务端调用,不写入任何服务器存储。
            </p>
            <input
              type="password"
              value={deepseekKey}
              onChange={(e) => setDeepseekKey(e.target.value)}
              placeholder="粘贴 DeepSeek API Key(sk-…)"
              className="mt-2 w-full rounded-lg border border-warn/50 bg-surface p-2 text-sm text-ink transition focus:border-warn focus:outline-none focus:ring-2 focus:ring-warn/20"
            />
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-primary px-6 py-2 font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98]"
          >
            保存设置
          </button>
          {saved && <span className="fade-in text-sm font-medium text-success">已保存,立即生效</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 text-xs leading-relaxed text-ink-secondary shadow-sm">
        <p className="font-semibold text-ink">关于模型与费用</p>
        <p className="mt-1">
          · 智谱模型(GLM)使用服务端配置的 key,选付费模型时费用计入服务端账户;
          DeepSeek 采用 BYOK(自带 Key),费用计入你自己的 DeepSeek 账户。
        </p>
        <p className="mt-1">
          · 图片简历 OCR 固定使用免费的 glm-4v-flash,不随此项切换(DeepSeek 暂无视觉模型)。
        </p>
      </section>

      <DataBackupCard />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DiagnoseItem, DiagnoseResult } from "@/lib/types";
import { getLastDiagnosis, saveLastDiagnosis } from "@/lib/storage";
import { newId, postJson } from "@/lib/client";
import { settingsPayload } from "@/lib/models";
import ResumeFileImport from "@/components/ResumeFileImport";

export default function ResumePage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnoseResult | null>(null);

  // 恢复上次诊断(刷新不丢结果)
  useEffect(() => {
    const last = getLastDiagnosis();
    if (last) {
      setResumeText(last.resumeText);
      setJdText(last.jdText);
      setResult(last.result);
    }
  }, []);

  async function diagnose() {
    const rt = resumeText.trim();
    if (busy) return;
    if (!rt) {
      setError("请先粘贴简历文本");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await postJson<DiagnoseResult & { ok: boolean }>("/api/resume/diagnose", {
        resumeText: rt,
        jdText: jdText.trim(),
        ...settingsPayload(),
      });
      const result: DiagnoseResult = {
        score: data.score,
        expand: data.expand ? data.expand : [],
        vague: data.vague ? data.vague : [],
        remove: data.remove ? data.remove : [],
        dropped: data.dropped ? data.dropped : 0,
        parsed: !!data.parsed,
        raw: data.raw,
      };
      setResult(result);
      saveLastDiagnosis({
        id: newId(),
        resumeText: rt,
        jdText: jdText.trim(),
        result,
        ts: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "诊断请求失败");
    } finally {
      setBusy(false);
    }
  }

  function renderList(
    title: string,
    tone: "emerald" | "amber" | "red",
    items: DiagnoseItem[]
  ) {
  const toneCls: Record<string, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };
  return (
    <div className="mt-4 space-y-3">
      <p className={`text-sm font-bold ${toneCls[tone]}`}>{title}({items.length})</p>
      {items.length === 0 && <p className="text-sm text-slate-400">无</p>}
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-3">
          <blockquote className="border-l-4 border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
            「{it.quote}」
          </blockquote>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{it.reason}</p>
          {it.example && (
            <p className="mt-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm leading-relaxed text-blue-900">
              改写示例:{it.example}
            </p>
          )}
        </div>
      ))}
    </div>
  );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">简历诊断</h1>
        <p className="mt-1 text-sm text-slate-500">
          粘贴简历全文和目标岗位 JD。诊断标准:每个词都要能经得住面试官两层追问("具体怎么做的?为什么这么做?")。
        </p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">简历全文</p>
          <ResumeFileImport onText={(t) => setResumeText(t)} label="导入简历文件(PDF/docx/图片)" />
        </div>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={10}
          placeholder="粘贴简历纯文本,或点上方按钮导入 PDF / docx / 图片简历…"
          className="thin-scroll mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">{resumeText.trim().length} 字</p>

        <p className="mt-4 text-sm font-medium text-slate-700">目标岗位 JD(选填)</p>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={5}
          placeholder="粘贴 JD,不填则按通用校招标准诊断"
          className="thin-scroll mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">{jdText.trim().length} 字</p>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => void diagnose()}
            disabled={busy || resumeText.trim().length === 0}
            className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? "诊断中…" : "开始诊断"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </section>

      {result && (
        <section className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-blue-600">{result.score}</span>
              <span className="text-sm text-slate-500">/ 100 总体评分</span>
              {!result.parsed && (
                <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  解析失败
                </span>
              )}
            </div>
            {result.dropped > 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                已自动剔除 {result.dropped} 条引用与原文不符的条目(防止虚构)。
              </p>
            )}
            {!result.parsed && result.raw && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-500">查看原始输出</summary>
                <pre className="thin-scroll mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">
                  {result.raw}
                </pre>
              </details>
            )}
          </div>

          {renderList("值得展开的经历", "emerald", result.expand)}
          {renderList("太虚的表述", "amber", result.vague)}
          {renderList("该删的信息", "red", result.remove)}
        </section>
      )}
    </div>
  );
}

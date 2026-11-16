"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { DiagnoseItem, DiagnoseResult } from "@/lib/types";
import { getLastDiagnosis, saveLastDiagnosis } from "@/lib/storage";
import { newId, postJson } from "@/lib/client";
import { settingsPayload } from "@/lib/models";
import ResumeFileImport from "@/components/ResumeFileImport";
import ScoreRing from "@/components/ScoreRing";
import { Skeleton, ScoreCardSkeleton, TextSkeleton } from "@/components/Skeleton";
import {
  Sparkles,
  Loader,
  XCircle,
  Check,
  AlertTriangle,
} from "@/components/icons";

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
    tone: "success" | "warn" | "danger",
    items: DiagnoseItem[]
  ) {
    const iconMap: Record<string, ReactElement> = {
      success: <Check className="h-3.5 w-3.5" />,
      warn: <AlertTriangle className="h-3.5 w-3.5" />,
      danger: <XCircle className="h-3.5 w-3.5" />,
    };
    const badgeCls: Record<string, string> = {
      success: "bg-success-soft text-success",
      warn: "bg-warn-soft text-warn",
      danger: "bg-danger-soft text-danger",
    };
    return (
      <section className="fade-in">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${badgeCls[tone]}`}>
            {iconMap[tone]}
          </span>
          {title}({items.length})
        </h3>
        {items.length === 0 && <p className="mt-2 text-sm text-ink-tertiary">无</p>}
        {items.map((it, i) => (
          <div key={i} className="mt-2 rounded-xl border border-line bg-surface p-3 shadow-sm transition hover:border-line-strong">
            {/* D2:引用块层级(左竖线 + 引号) */}
            <blockquote className="border-l-4 border-line-strong bg-surface-muted px-3 py-1.5 text-sm text-ink">
              「{it.quote}」
            </blockquote>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{it.reason}</p>
            {it.example && (
              <p className="mt-2 rounded-lg bg-primary-soft px-3 py-1.5 text-sm leading-relaxed text-primary" >
                <span className="mr-1 font-semibold">改写示例</span>{it.example}
              </p>
            )}
          </div>
        ))}
      </section>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-bold">简历诊断</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          粘贴简历全文和目标岗位 JD。诊断标准:每个词都要能经得住面试官两层追问("具体怎么做的?为什么这么做?")。
        </p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink">简历全文</p>
          <ResumeFileImport onText={(t) => setResumeText(t)} label="导入简历文件(PDF/docx/图片)" />
        </div>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={10}
          placeholder="粘贴简历纯文本,或点上方按钮导入 PDF / docx / 图片简历…"
          className="thin-scroll mt-2 w-full resize-none rounded-xl border border-line bg-surface p-3 text-sm text-ink transition placeholder:text-ink-tertiary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        <p className="mt-1 text-xs tabular-nums text-ink-tertiary">{resumeText.trim().length} 字</p>

        <p className="mt-4 text-sm font-medium text-ink">目标岗位 JD(选填)</p>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={5}
          placeholder="粘贴 JD,不填则按通用校招标准诊断"
          className="thin-scroll mt-2 w-full resize-none rounded-xl border border-line bg-surface p-3 text-sm text-ink transition placeholder:text-ink-tertiary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        <p className="mt-1 text-xs tabular-nums text-ink-tertiary">{jdText.trim().length} 字</p>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => void diagnose()}
            disabled={busy || resumeText.trim().length === 0}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy && <Loader className="h-4 w-4" />}
            {busy ? "诊断中…" : "开始诊断"}
          </button>
          {error && (
            <span className="flex items-center gap-1 text-sm text-danger">
              <XCircle className="h-4 w-4" />
              {error}
            </span>
          )}
        </div>
      </section>

      {/* D3 诊断中:结果区骨架,替代按钮文字变化 */}
      {busy && (
        <section className="fade-in space-y-4" aria-label="诊断中">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-5">
              <Skeleton className="h-28 w-28 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <TextSkeleton lines={2} />
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                <Skeleton className="h-4 w-28" />
                <ScoreCardSkeleton className="mt-3" />
              </div>
            ))}
          </div>
        </section>
      )}

      {result && !busy && (
        <section className="space-y-4">
          {/* D1 分数展示:环形进度 + 段位色(替代大数字裸奔) */}
          <div className="fade-in rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-5">
              <ScoreRing score={result.score} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">总体评分</p>
                <p className="mt-1 text-xs text-ink-tertiary">满分 100 · 按每个词都守得住两层追问的标准评定</p>
                {!result.parsed && (
                  <span className="mt-2 inline-block rounded bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
                    解析失败
                  </span>
                )}
                {result.dropped > 0 && (
                  <p className="mt-2 rounded-lg bg-warn-soft px-3 py-1.5 text-xs text-warn">
                    已自动剔除 {result.dropped} 条引用与原文不符的条目(防止虚构)。
                  </p>
                )}
                {!result.parsed && result.raw && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-ink-tertiary">查看原始输出</summary>
                    <pre className="thin-scroll mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-surface-muted p-2 text-xs text-ink-secondary">
                      {result.raw}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>

          {renderList("值得展开的经历", "success", result.expand)}
          {renderList("太虚的表述", "warn", result.vague)}
          {renderList("该删的信息", "danger", result.remove)}
        </section>
      )}
    </div>
  );
}

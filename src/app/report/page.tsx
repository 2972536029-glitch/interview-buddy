"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ReportData,
  Session,
  TOTAL_QUESTIONS,
  interviewTypeLabel,
  jobFamilyLabel,
} from "@/lib/types";
import { getSession, saveSession } from "@/lib/storage";
import { newId, postJson } from "@/lib/client";
import RadarChart from "@/components/RadarChart";
import ScoreRing from "@/components/ScoreRing";
import { Skeleton, TextSkeleton } from "@/components/Skeleton";
import {
  Target,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
  Loader,
  Sparkles,
} from "@/components/icons";
import { DimScores } from "@/lib/types";

const DIMS: Array<{ key: keyof DimScores; label: string }> = [
  { key: "structure", label: "表达结构" },
  { key: "quantification", label: "内容量化" },
  { key: "colloquial", label: "口语化" },
  { key: "duration", label: "答题时长" },
];

type Phase = "loading" | "notfound" | "ongoing" | "ready";

export default function ReportPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    const s = id ? getSession(id) : null;
    if (!s) {
      setPhase("notfound");
      return;
    }
    setSession(s);
    setPhase(s.report ? "ready" : s.status === "ongoing" ? "ongoing" : "ready");
  }, []);

  async function generate() {
    const cur = session;
    if (!cur || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postJson<ReportData & { ok: boolean }>("/api/interview/report", {
        jobFamily: cur.jobFamily,
        interviewType: cur.interviewType,
        history: cur.messages.map((m) => ({ role: m.role, content: m.content })),
        grades: cur.grades,
      });
      const report: ReportData = {
        rows: data.rows,
        radar: data.radar,
        summary: data.summary,
        weakness: data.weakness,
        redLines: data.redLines,
        practiceTomorrow: data.practiceTomorrow,
        parsed: data.parsed,
      };
      const updated: Session = { ...cur, status: "finished", report };
      setSession(updated);
      saveSession(updated);
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成报告失败");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="space-y-4" aria-label="加载中">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-2xl lg:col-span-1" />
          <Skeleton className="h-72 w-full rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }
  if (phase === "notfound") {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-secondary">报告不存在或会话已被删除。</p>
        <Link href="/" className="mt-3 inline-block text-primary hover:underline">
          回首页
        </Link>
      </div>
    );
  }
  if (phase === "ongoing" || !session) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-secondary">这场面试还没完成,完成后才能生成报告。</p>
        <Link
          href={`/interview?id=${session ? session.id : ""}`}
          className="mt-3 inline-block text-primary hover:underline"
        >
          继续面试 →
        </Link>
      </div>
    );
  }

  // 薄弱点专项练习:带上场报告的弱点/红线作为下一场的出题上下文
  function startDrill() {
    const r = session?.report;
    if (!session || !r) return;
    const focus = [r.weakness, ...r.redLines].filter(Boolean).join(";");
    const ctx = `【专项练习场】针对上一场面试薄弱点的专项训练。薄弱点:${focus || "综合表达"}。本场全部题目请围绕这些薄弱点,从不同角度出题并持续追问,验证候选人是否真正掌握。`;
    const ns: Session = {
      id: newId(),
      jobFamily: session.jobFamily,
      interviewType: session.interviewType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "ongoing",
      messages: [],
      currentQuestionIndex: 0,
      followups: 0,
      grades: [],
      contextText: ctx,
    };
    saveSession(ns);
    router.push(`/interview?id=${ns.id}`);
  }

  const r = session.report;
  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">复盘报告</h1>
          <p className="mt-0.5 text-xs text-ink-tertiary">
            {jobFamilyLabel(session.jobFamily)} · {interviewTypeLabel(session.interviewType)} · {new Date(session.updatedAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <div className="no-print flex gap-2">
          {session.report && (
            <button
              onClick={startDrill}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              针对薄弱点专项练
            </button>
          )}
          {r && (
            <button
              onClick={() => window.print()}
              className="no-print rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-secondary transition hover:bg-surface-muted"
            >
              导出/打印
            </button>
          )}
          <Link href="/history" className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-secondary transition hover:bg-surface-muted">
            历史记录
          </Link>
        </div>
      </div>

      {!r && (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
          <p className="text-sm text-ink-secondary">面试已完成,报告还没生成。</p>
          <button
            onClick={() => void generate()}
            disabled={busy}
            className="mt-3 flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {busy ? (<><Loader className="h-4 w-4" /> 生成中…</>) : (<><Sparkles className="h-4 w-4" /> 生成复盘报告</>)}
          </button>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}

      {r && (
        <>
          {/* R1 总评分:环形进度 + 段位色,总评文字在右侧 */}
          <div className="fade-in rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <ScoreRing score={Math.round(((r.radar.structure + r.radar.quantification + r.radar.colloquial + r.radar.duration) / 4) * 20)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">一句话总评</h2>
                  {!r.parsed && (
                    <span className="inline-block rounded bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">解析失败</span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{r.summary}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-5 shadow-sm lg:col-span-1">
              <h2 className="self-start font-bold">四维雷达</h2>
              <RadarChart dims={r.radar} size={260} />
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm lg:col-span-2">
              <h2 className="font-bold">每题得分表</h2>
              <div className="mt-3 overflow-x-auto">
                {/* R3:行 hover 高亮 + 分数色阶徽章(低分琥珀/中主色/高分绿) */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-tertiary">
                      <th className="py-2 pr-3 font-medium">题号</th>
                      <th className="py-2 pr-3 font-medium">问题</th>
                      {DIMS.map((d) => (
                        <th key={d.key} className="py-2 pr-3 font-medium">{d.label}</th>
                      ))}
                      <th className="py-2 font-medium">追问数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((row) => (
                      <tr key={row.index} className="border-b border-line/60 transition-colors hover:bg-surface-muted">
                        <td className="py-2 pr-3 font-semibold">{row.index}</td>
                        <td className="max-w-[16rem] truncate py-2 pr-3 text-ink-secondary" title={row.question}>
                          {row.question}
                        </td>
                        {DIMS.map((d) => {
                          const v = row.scores[d.key];
                          return (
                            <td key={d.key} className="py-2 pr-3">
                              <span
                                className={`inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums ${
                                  v >= 4
                                    ? "bg-success-soft text-success"
                                    : v >= 3
                                      ? "bg-primary-soft text-primary"
                                      : "bg-warn-soft text-warn"
                                }`}
                              >
                                {v}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-2 tabular-nums text-ink-secondary">{row.followups}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* R2:三卡视觉区分 —— 薄弱点(靶心) / 红线(强警示) / 明天练什么(清单) */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Target className="h-3.5 w-3.5" />
                </span>
                薄弱点
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{r.weakness || "-"}</p>
            </div>
            <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-danger">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-danger/15 text-danger">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                红线预警(守不住的点)
              </h2>
              {r.redLines.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {r.redLines.map((x, i) => (
                    <li
                      key={i}
                      className="border-l-2 border-danger/50 pl-2.5 text-sm leading-relaxed text-ink-secondary"
                    >
                      {x}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-tertiary">无</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-success-soft text-success">
                <ClipboardList className="h-3.5 w-3.5" />
              </span>
              明天练什么
            </h2>
            {r.practiceTomorrow.length > 0 ? (
              <ol className="mt-3 space-y-2">
                {r.practiceTomorrow.map((x, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-secondary">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-[10px] font-bold text-success">
                      {i + 1}
                    </span>
                    {x}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-ink-tertiary">无</p>
            )}
          </div>

          <details className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <summary className="cursor-pointer font-bold">对话回放</summary>
            <div className="mt-3 space-y-2.5">
              {session.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "candidate" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === "candidate" ? "bg-primary text-white" : "bg-surface-inset text-ink"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

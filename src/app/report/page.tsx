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
    return <p className="py-20 text-center text-slate-400">加载中…</p>;
  }
  if (phase === "notfound") {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">报告不存在或会话已被删除。</p>
        <Link href="/" className="mt-3 inline-block text-blue-600 hover:underline">
          回首页
        </Link>
      </div>
    );
  }
  if (phase === "ongoing" || !session) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">这场面试还没完成,完成后才能生成报告。</p>
        <Link
          href={`/interview?id=${session ? session.id : ""}`}
          className="mt-3 inline-block text-blue-600 hover:underline"
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-bold">复盘报告</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {jobFamilyLabel(session.jobFamily)} · {interviewTypeLabel(session.interviewType)} · {new Date(session.updatedAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <div className="flex gap-2">
          {session.report && (
            <button
              onClick={startDrill}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              针对薄弱点专项练
            </button>
          )}
          <Link href="/history" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            历史记录
          </Link>
        </div>
      </div>

      {!r && (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-500">面试已完成,报告还没生成。</p>
          <button
            onClick={() => void generate()}
            disabled={busy}
            className="mt-3 rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "生成中…" : "生成复盘报告"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {r && (
        <>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="font-bold">一句话总评</h2>
              {!r.parsed && (
                <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">解析失败</span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{r.summary}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-5 shadow-sm lg:col-span-1">
              <h2 className="self-start font-bold">四维雷达</h2>
              <RadarChart dims={r.radar} size={260} />
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="font-bold">每题得分表</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="py-2 pr-3">题号</th>
                      <th className="py-2 pr-3">问题</th>
                      {DIMS.map((d) => (
                        <th key={d.key} className="py-2 pr-3">{d.label}</th>
                      ))}
                      <th className="py-2">追问数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((row) => (
                      <tr key={row.index} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-semibold">{row.index}</td>
                        <td className="max-w-[16rem] truncate py-2 pr-3 text-slate-600" title={row.question}>
                          {row.question}
                        </td>
                        {DIMS.map((d) => (
                          <td key={d.key} className="py-2 pr-3">{row.scores[d.key]}</td>
                        ))}
                        <td className="py-2">{row.followups}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="font-bold">薄弱点</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{r.weakness || "-"}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="font-bold">红线预警(守不住的点)</h2>
              {r.redLines.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {r.redLines.map((x, i) => (
                    <li key={i} className="text-sm leading-relaxed text-slate-700">⚠️ {x}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-400">无</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">明天练什么</h2>
            {r.practiceTomorrow.length > 0 ? (
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                {r.practiceTomorrow.map((x, i) => (
                  <li key={i} className="text-sm leading-relaxed text-slate-700">{x}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-slate-400">无</p>
            )}
          </div>

          <details className="rounded-2xl bg-white p-5 shadow-sm">
            <summary className="cursor-pointer font-bold">对话回放</summary>
            <div className="mt-3 space-y-2.5">
              {session.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "candidate" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === "candidate" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"
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

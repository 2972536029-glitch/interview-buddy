"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DimScores,
  Session,
  TOTAL_QUESTIONS,
  interviewTypeLabel,
  jobFamilyLabel,
} from "@/lib/types";
import { deleteSession, listSessions } from "@/lib/storage";
import { avgDims, buildRows } from "@/lib/scoring";

// 分数曲线:已出报告的场次按时间顺序连成折线(纵轴 = 四维平均分,满分 5)
function ScoreCurve({ values, labels }: { values: number[]; labels: string[] }) {
  if (values.length === 0) return null;
  const W = 600;
  const H = 120;
  const pad = 24;
  const stepX = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0;
  const y = (v: number) => H - pad - ((Math.max(0, Math.min(5, v))) / 5) * (H - pad * 2);
  const pts = values
    .map((v, i) => `${(pad + i * stepX).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="历次得分曲线">
      <line x1={pad} y1={y(5)} x2={W - pad} y2={y(5)} stroke="#e2e8f0" strokeWidth="1" />
      <line x1={pad} y1={y(3)} x2={W - pad} y2={y(3)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
      <line x1={pad} y1={y(1)} x2={W - pad} y2={y(1)} stroke="#e2e8f0" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="2" />
      {values.map((v, i) => (
        <circle key={i} cx={pad + i * stepX} cy={y(v)} r="3.5" fill="#2563eb" />
      ))}
    </svg>
  );
}

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setMounted(true);
    setSessions(listSessions());
  }, []);

  function remove(id: string) {
    const ok = window.confirm("确定删除这条记录吗?删除后不可恢复。");
    if (!ok) return;
    deleteSession(id);
    setSessions(listSessions());
  }

  const finishedWithReport = sessions.filter((s) => s.status === "finished" && s.report);
  // 曲线按时间正序(早 → 晚)
  const chrono = [...finishedWithReport].sort((a, b) => a.updatedAt - b.updatedAt);
  const curveValues = chrono.map((s) => {
    const radar = avgDims(buildRows(s.grades));
    const vals: DimScores = radar;
    return +(((vals.structure + vals.quantification + vals.colloquial + vals.duration) / 4) || 0).toFixed(2);
  });
  const curveLabels = chrono.map((s) => jobFamilyLabel(s.jobFamily));

  if (!mounted) {
    return <p className="py-20 text-center text-slate-400">加载中…</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">历史记录</h1>

      {finishedWithReport.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">历次得分曲线</h2>
          <p className="mt-1 text-xs text-slate-400">
            已出报告的 {finishedWithReport.length} 场面试,四维平均分(满分 5)
          </p>
          <ScoreCurve values={curveValues} labels={curveLabels} />
        </section>
      )}

      {sessions.length === 0 ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">还没有练习记录。</p>
          <Link href="/" className="mt-3 inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            去开始第一场
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          {sessions.map((s) => {
            const rows = buildRows(s.grades);
            const radar = avgDims(rows);
            const overall = +(((radar.structure + radar.quantification + radar.colloquial + radar.duration) / 4) || 0).toFixed(1);
            return (
              <div key={s.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">
                      {jobFamilyLabel(s.jobFamily)} · {interviewTypeLabel(s.interviewType)}
                      {s.contextText?.startsWith("【专项练习场】") && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">专项</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(s.updatedAt).toLocaleString("zh-CN")} · 进度 {s.currentQuestionIndex}/{TOTAL_QUESTIONS} 题 · 均分 {overall || "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "finished" ? (
                      <Link href={`/report?id=${s.id}`} className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                        查看报告
                      </Link>
                    ) : (
                      <Link href={`/interview?id=${s.id}`} className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                        继续面试
                      </Link>
                    )}
                    <button
                      onClick={() => remove(s.id)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

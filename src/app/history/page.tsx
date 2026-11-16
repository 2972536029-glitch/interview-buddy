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
import { Skeleton, TextSkeleton } from "@/components/Skeleton";
import { TrendingUp, Trash2, ArrowRight } from "@/components/icons";

// 分数曲线:已出报告的场次按时间顺序连成折线(纵轴 = 四维平均分,满分 5)
// Y1:加 y 轴刻度文字与每点悬停提示(<title>);颜色走 token 类,暗色自适应
function ScoreCurve({ values, labels }: { values: number[]; labels: string[] }) {
  if (values.length === 0) return null;
  const W = 600;
  const H = 120;
  const pad = 24;
  const stepX = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0;
  const y = (v: number) => H - pad - ((Math.max(0, Math.min(5, v))) / 5) * (H - pad * 2);
  const pts = values
    .map((v, i) => `${(pad + i * stepX) .toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="历次得分曲线">
      {/* Y1:y 轴刻度(1/3/5 分参考线) */}
      {([5, 3, 1] as const).map((v) => (
        <g key={v}>
          <line
            x1={pad} y1={y(v)} x2={W - pad} y2={y(v)}
            className="stroke-line"
            strokeWidth="1"
            strokeDasharray={v === 3 ? "4 4" : undefined}
          />
          <text x={pad - 6} y={y(v) + 3} textAnchor="end" fontSize="9" className="fill-ink-tertiary">
            {v}
          </text>
        </g>
      ))}
      <polyline points={pts} fill="none" className="stroke-primary" strokeWidth="2" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={pad + i * stepX}
          cy={y(v)}
          r="3.5"
          className="fill-primary stroke-surface"
          strokeWidth="1.5"
        >
          {/* Y1:悬停提示(第 i 场 · 均分) */}
          <title>{`${labels[i] || `第 ${i + 1} 场`} · 均分 ${v}`}</title>
        </circle>
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
    // G6:骨架屏替代纯文字加载态
    return (
      <div className="space-y-3" aria-label="加载中">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <h1 className="text-xl font-bold">历史记录</h1>

      {finishedWithReport.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-soft text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            历次得分曲线
          </h2>
          <p className="mt-1 text-xs text-ink-tertiary">
            已出报告的 {finishedWithReport.length} 场面试,四维平均分(满分 5)· 悬停数据点查看详情
          </p>
          <ScoreCurve values={curveValues} labels={curveLabels} />
        </section>
      )}

      {sessions.length === 0 ? (
        <section className="rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <p className="text-sm text-ink-secondary">还没有练习记录。</p>
          <Link href="/" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover">
            去开始第一场
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          {sessions.map((s) => {
            const rows = buildRows(s.grades);
            const radar = avgDims(rows);
            const overall = +(((radar.structure + radar.quantification + radar.colloquial + radar.duration) / 4) || 0).toFixed(1);
            // Y1:均分色阶徽章
            const overallCls =
              overall >= 4
                ? "bg-success-soft text-success"
                : overall >= 3
                  ? "bg-primary-soft text-primary"
                  : "bg-warn-soft text-warn";
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-line-strong hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {jobFamilyLabel(s.jobFamily)} · {interviewTypeLabel(s.interviewType)}
                      {s.contextText?.startsWith("【专项练习场】") && (
                        <span className="ml-1.5 rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold text-warn">专项</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-ink-tertiary">
                      {new Date(s.updatedAt).toLocaleString("zh-CN")} · 进度 {s.currentQuestionIndex}/{TOTAL_QUESTIONS} 题
                    </p>
                    {/* 进度微条(Y1 信息层次) */}
                    <div className="mt-2 h-1 w-28 overflow-hidden rounded-full bg-surface-inset">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(s.currentQuestionIndex / TOTAL_QUESTIONS) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {overall > 0 && (
                      <span
                        className={`mr-1 inline-flex h-8 min-w-9 items-center justify-center rounded-lg px-1.5 text-sm font-bold tabular-nums ${overallCls}`}
                        title="四维平均分(满分 5)"
                      >
                        {overall}
                      </span>
                    )}
                    {s.status === "finished" ? (
                      <Link href={`/report?id=${s.id}`} className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover">
                        查看报告
                      </Link>
                    ) : (
                      <Link href={`/interview?id=${s.id}`} className="flex items-center gap-1 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-hover">
                        继续面试
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                    {/* Y2:删除弱化为 ghost 图标按钮,hover 才显危险色(confirm 保留) */}
                    <button
                      onClick={() => remove(s.id)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-ink-tertiary transition hover:bg-danger-soft hover:text-danger"
                      title="删除这条记录"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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

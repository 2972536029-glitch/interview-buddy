"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  INTERVIEW_TYPES,
  InterviewType,
  JOB_FAMILIES,
  JobFamily,
  Session,
  TOTAL_QUESTIONS,
  interviewTypeLabel,
  jobFamilyLabel,
} from "@/lib/types";
import { listSessions, saveSession } from "@/lib/storage";
import { newId } from "@/lib/client";
import ResumeFileImport from "@/components/ResumeFileImport";
import { Skeleton, TextSkeleton } from "@/components/Skeleton";
import { Check, Sparkles, ArrowRight, FileText, TrendingUp } from "@/components/icons";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [family, setFamily] = useState<JobFamily>("frontend");
  const [type, setType] = useState<InterviewType>("behavioral");
  const [contextText, setContextText] = useState("");
  const [recent, setRecent] = useState<Session[]>([]);

  // localStorage 只在挂载后读,避免 SSR 水合不一致
  useEffect(() => {
    setMounted(true);
    setRecent(listSessions().slice(0, 3));
  }, []);

  const startInterview = () => {
    const ctx = contextText.trim();
    const session: Session = {
      id: newId(),
      jobFamily: family,
      interviewType: type,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "ongoing",
      messages: [],
      currentQuestionIndex: 0,
      followups: 0,
      grades: [],
      ...(ctx ? { contextText: ctx } : {}),
    };
    saveSession(session);
    router.push(`/interview?id=${session.id}`);
  };

  return (
    <div className="page-enter space-y-8">
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-bold">练面试,找搭子</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          选练习方向和面试类型,AI 面试官一次一题、逐层追问、逐题点评,答完出复盘报告。
        </p>

        <p className="mt-6 text-sm font-medium text-ink">选择练习方向</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {JOB_FAMILIES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFamily(f.id)}
              className={`relative rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                family === f.id
                  ? "border-primary bg-primary-soft ring-1 ring-primary"
                  : "border-line bg-surface hover:border-primary/40"
              }`}
            >
              {/* H1 选中态:角标对勾 + 轻微上浮 */}
              {family === f.id && (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <div className="font-semibold">{f.label}</div>
              <div className="mt-1 text-xs text-ink-secondary">{f.desc}</div>
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm font-medium text-ink">选择面试类型</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {INTERVIEW_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`relative rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                type === t.id
                  ? "border-primary bg-primary-soft ring-1 ring-primary"
                  : "border-line bg-surface hover:border-primary/40"
              }`}
            >
              {type === t.id && (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <div className="font-semibold">{t.label}</div>
              <div className="mt-1 text-xs text-ink-secondary">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* H3:材料框弱化 —— 虚线边框 + 「选填」徽章,视觉降级为次要区块 */}
        <div className="mt-6 rounded-xl border border-dashed border-line-strong bg-surface-muted/50 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              简历要点 / 目标 JD
              <span className="rounded-full bg-surface-inset px-2 py-0.5 text-[10px] font-normal text-ink-tertiary">选填</span>
            </p>
            <ResumeFileImport onText={(t) => setContextText(t)} label="导入简历文件" />
          </div>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            rows={3}
            placeholder="粘贴简历要点或 JD,面试官将优先从这些真实经历出题、并验证你讲的是不是真的…"
            className="thin-scroll mt-2 w-full resize-none rounded-lg border border-line bg-surface p-3 text-sm text-ink transition placeholder:text-ink-tertiary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        {/* H2 主行动:渐变大按钮,层级与下方卡拉开 */}
        <button
          onClick={startInterview}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-95 hover:shadow-md active:scale-[0.99] sm:w-auto sm:px-10"
        >
          <Sparkles className="h-4 w-4" />
          开始面试(5 题)
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold">简历诊断</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                粘贴简历与目标岗位 JD,按「每个词都守得住两层追问」的标准输出三类问题清单与改写示例。
              </p>
            </div>
          </div>
          <Link
            href="/resume"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-surface transition hover:opacity-85"
          >
            去诊断
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-success-soft text-success">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            最近练习
          </h2>
          <Link href="/history" className="text-sm text-primary hover:underline">
            全部历史 →
          </Link>
        </div>
        {!mounted ? (
          <TextSkeleton lines={2} className="mt-4" />
        ) : recent.length > 0 ? (
          <ul className="mt-3 divide-y divide-line/70">
            {recent.map((s) => (
              <li key={s.id} className="py-2.5 text-sm">
                <Link
                  href={s.status === "finished" ? `/report?id=${s.id}` : `/interview?id=${s.id}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-muted"
                >
                  <span className="font-medium">{jobFamilyLabel(s.jobFamily)} · {interviewTypeLabel(s.interviewType)}</span>
                  <span className="text-xs tabular-nums text-ink-tertiary">{new Date(s.updatedAt).toLocaleString("zh-CN")}</span>
                  <span className={`ml-auto text-xs font-medium ${s.status === "finished" ? "text-success" : "text-primary"}`}>
                    {s.status === "finished" ? "已出报告,点击查看" : `进行中 ${s.currentQuestionIndex}/${TOTAL_QUESTIONS} 题`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-tertiary">还没有练习记录,开始第一场吧</p>
        )}
      </section>
    </div>
  );
}

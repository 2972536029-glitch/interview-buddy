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
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">练面试,找搭子</h1>
        <p className="mt-1 text-sm text-slate-500">
          选岗位族和面试类型,AI 面试官一次一题、逐层追问、逐题点评,答完出复盘报告。
        </p>

        <p className="mt-6 text-sm font-medium text-slate-700">选择岗位族</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {JOB_FAMILIES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFamily(f.id)}
              className={`rounded-xl border p-4 text-left transition ${
                family === f.id
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold">{f.label}</div>
              <div className="mt-1 text-xs text-slate-500">{f.desc}</div>
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm font-medium text-slate-700">选择面试类型</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {INTERVIEW_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`rounded-xl border p-4 text-left transition ${
                type === t.id
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="mt-1 text-xs text-slate-500">{t.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">
            简历要点 / 目标 JD(选填,面试官会围绕它出题追问)
          </p>
          <ResumeFileImport onText={(t) => setContextText(t)} label="导入简历文件" />
        </div>
        <textarea
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
          rows={3}
          placeholder="粘贴简历要点或 JD,面试官将优先从这些真实经历出题、并验证你讲的是不是真的…"
          className="thin-scroll mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none"
        />

        <button
          onClick={startInterview}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          开始面试(5 题)
        </button>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">简历诊断</h2>
            <p className="mt-1 text-sm text-slate-500">
              粘贴简历与目标岗位 JD,按「每个词都守得住两层追问」的标准输出三类问题清单与改写示例。
            </p>
          </div>
          <Link
            href="/resume"
            className="shrink-0 rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            去诊断
          </Link>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">最近练习</h2>
          <Link href="/history" className="text-sm text-blue-600 hover:underline">
            全部历史 →
          </Link>
        </div>
        {mounted && recent.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.map((s) => (
              <li key={s.id} className="py-2.5 text-sm">
                <Link
                  href={s.status === "finished" ? `/report?id=${s.id}` : `/interview?id=${s.id}`}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="font-medium">{jobFamilyLabel(s.jobFamily)} · {interviewTypeLabel(s.interviewType)}</span>
                  <span className="text-slate-400">{new Date(s.updatedAt).toLocaleString("zh-CN")}</span>
                  <span className="text-xs text-blue-600">
                    {s.status === "finished" ? "已出报告,点击查看" : `进行中 ${s.currentQuestionIndex}/${TOTAL_QUESTIONS} 题`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            {mounted ? "还没有练习记录,开始第一场吧" : "加载中…"}
          </p>
        )}
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChatMessage,
  DimScores,
  Grade,
  InterviewHistoryItem,
  ReportData,
  Session,
  TOTAL_QUESTIONS,
  interviewTypeLabel,
  jobFamilyLabel,
} from "@/lib/types";
import { getSession, saveSession } from "@/lib/storage";
import { newId, postJson, streamText } from "@/lib/client";
import { settingsPayload } from "@/lib/models";
import { estimateSeconds } from "@/lib/scoring";
import ScoreCard from "@/components/ScoreCard";

// 面试页状态机: loading -> notfound / (asking <-> await) -> finished
// 首题与断点续答(退出时回答已存但下一问未生成)自动续跑
type Phase = "loading" | "notfound" | "asking" | "await" | "finished";

export default function InterviewPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [streamBuf, setStreamBuf] = useState("");
  const [answer, setAnswer] = useState("");
  const [gradeState, setGradeState] = useState<{
    loading: boolean;
    grade: Grade | null;
    error: string | null;
  }>({ loading: false, grade: null, error: null });
  const [banner, setBanner] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  // 所有动作经 sessionRef 同步读写,避免"点评"与"下一问"并行时的丢失更新
  const sessionRef = useRef<Session | null>(null);
  const startedRef = useRef(false);
  const busyRef = useRef(false);
  const lastGradeInputRef = useRef<{
    question: string;
    answer: string;
    questionIndex: number;
    followupNo: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function patchSession(mutate: (s: Session) => Session): Session | null {
    const cur = sessionRef.current;
    if (!cur) return null;
    const next = mutate(cur);
    sessionRef.current = next;
    setSession(next);
    saveSession(next);
    return next;
  }
  function parseTag(text: string): { tag: string | null; content: string } {
    const m = text.match(/^\s*<(新题|追问|结束)>\s*/);
    return m
      ? { tag: m[1], content: text.slice(m[0].length).trim() }
      : { tag: null, content: text.trim() };
  }

  // #NOTES# 双通道(借鉴开源 Interviewer 项目):分隔符后是面试官私有笔记,候选人不可见
  function splitNotes(text: string): { visible: string; notes: string[] } {
    const idx = text.indexOf("#NOTES#");
    if (idx === -1) return { visible: text.trim(), notes: [] };
    const visible = text.slice(0, idx).trim();
    const notesPart = text.slice(idx + 7).trim();
    const notes = notesPart
      ? notesPart
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    return { visible, notes };
  }

  function msg(kind: ChatMessage["kind"], content: string): ChatMessage {
    return { id: newId(), role: "interviewer", content, kind, ts: Date.now() };
  }

  // TTS 朗读(浏览器自带 speechSynthesis,零依赖)
  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  }
  async function askNext(snap: Session, forceContinue = false): Promise<void> {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase("asking");
    setBanner(null);
    setStreamBuf("");
    const history: InterviewHistoryItem[] = snap.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    try {
      const full = await streamText(
        "/api/interview/next",
        {
          sessionId: snap.id,
          jobFamily: snap.jobFamily,
          interviewType: snap.interviewType,
          history,
          forceContinue,
          contextText: snap.contextText,
          hiddenNotes: snap.hiddenNotes,
          ...settingsPayload(),
          progress: { questionIndex: snap.currentQuestionIndex, followups: snap.followups },
        },
        (chunk) => setStreamBuf((pv) => pv + chunk)
      );
      const { tag, content: rawContent } = parseTag(full);
      const { visible, notes } = splitNotes(rawContent);
      const content = visible;
      const base = sessionRef.current ?? snap;
      const effTag =
        tag ??
        (snap.followups === 0
          ? "追问"
          : snap.currentQuestionIndex >= TOTAL_QUESTIONS
            ? "结束"
            : "新题");
      let closed = false;
      if (effTag === "新题") {
        if (base.currentQuestionIndex >= TOTAL_QUESTIONS) {
          closed = true; // 已满 5 题仍出"新题":丢弃内容,按结束处理
        } else {
          patchSession((s) => ({
            ...s,
            currentQuestionIndex: s.currentQuestionIndex + 1,
            followups: 0,
            messages: [...s.messages, msg("question", content)],
            ...(notes.length ? { hiddenNotes: [...(s.hiddenNotes ?? []), ...notes] } : {}),
          }));
        }
      } else if (effTag === "追问") {
        patchSession((s) => ({
          ...s,
          followups: s.followups + 1,
          messages: [...s.messages, msg("followup", content)],
          ...(notes.length ? { hiddenNotes: [...(s.hiddenNotes ?? []), ...notes] } : {}),
        }));
      } else {
        if (base.currentQuestionIndex < TOTAL_QUESTIONS && !forceContinue) {
          // 模型提前收尾(不满 5 题):丢弃结束语,强制续出一题(只重试一次,防死循环)
          busyRef.current = false;
          await askNext(sessionRef.current ?? snap, true);
          return;
        }
        closed = true;
      }
      if (closed) {
        if (content) {
          patchSession((s) => ({
            ...s,
            messages: [...s.messages, msg("closing", content)],
            ...(notes.length ? { hiddenNotes: [...(s.hiddenNotes ?? []), ...notes] } : {}),
          }));
        }
        setPhase("finished");
      } else {
        setPhase("await");
      }
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "出题失败,请重试");
      setPhase("await");
    } finally {
      busyRef.current = false;
    }
  }
  async function submitAnswer() {
    const cur = sessionRef.current;
    if (!cur || busyRef.current || phase !== "await") return;
    const text = answer.trim();
    if (!text) return;
    const lastQ = [...cur.messages]
      .reverse()
      .find((m) => m.role === "interviewer" && (m.kind === "question" || m.kind === "followup"));
    patchSession((s) => ({
      ...s,
      messages: [
        ...s.messages,
        { id: newId(), role: "candidate", content: text, kind: "answer", ts: Date.now() },
      ],
    }));
    setAnswer("");
    // 并行:逐题点评(不阻塞)+ 下一问(askNext 内部管理 busyRef)
    void fetchGrade(lastQ ? lastQ.content : "", text, cur.currentQuestionIndex, cur.followups);
    await askNext(sessionRef.current ?? cur);
  }
  async function fetchGrade(
    question: string,
    answerText: string,
    questionIndex: number,
    followupNo: number
  ) {
    lastGradeInputRef.current = { question, answer: answerText, questionIndex, followupNo };
    setGradeState({ loading: true, grade: null, error: null });
    try {
      const data = await postJson<{
        parsed: boolean;
        scores: DimScores | null;
        hits: string[];
        gaps: string[];
        view: string;
        raw?: string;
      }>("/api/interview/grade", {
        question,
        answer: answerText,
        jobFamily: sessionRef.current ? sessionRef.current.jobFamily : "general",
        ...settingsPayload(),
      });
      const grade: Grade = {
        id: newId(),
        questionIndex,
        question,
        answer: answerText,
        followupNo,
        scores: data.parsed ? data.scores : null,
        hits: data.hits ? data.hits : [],
        gaps: data.gaps ? data.gaps : [],
        view: data.view ? data.view : "",
        parsed: !!data.parsed,
        raw: data.raw,
        ts: Date.now(),
      };
      patchSession((s) => ({ ...s, grades: [...s.grades, grade] }));
      setGradeState({ loading: false, grade, error: null });
    } catch (e) {
      setGradeState({
        loading: false,
        grade: null,
        error: e instanceof Error ? e.message : "点评请求失败",
      });
    }
  }

  function retryGrade() {
    const inp = lastGradeInputRef.current;
    if (!inp) return;
    void fetchGrade(inp.question, inp.answer, inp.questionIndex, inp.followupNo);
  }
  async function generateReport() {
    const cur = sessionRef.current;
    if (!cur || reportBusy) return;
    setReportBusy(true);
    try {
      const data = await postJson<ReportData & { ok: boolean }>("/api/interview/report", {
        jobFamily: cur.jobFamily,
        interviewType: cur.interviewType,
        history: cur.messages.map((m) => ({ role: m.role, content: m.content })),
        grades: cur.grades,
        ...settingsPayload(),
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
      patchSession((s) => ({ ...s, status: "finished", report }));
      router.push(`/report?id=${cur.id}`);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "生成报告失败");
      setReportBusy(false);
    }
  }

  function finishNow() {
    const cur = sessionRef.current;
    if (!cur || reportBusy) return;
    const ok = window.confirm("确定提前结束本场面试并生成复盘报告吗?");
    if (ok) void generateReport();
  }
  // 挂载:读 URL 参数 -> 读 localStorage -> 续跑判断(StrictMode 双跑由 startedRef 挡住)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const id = new URLSearchParams(window.location.search).get("id");
    const s = id ? getSession(id) : null;
    if (!s) {
      setPhase("notfound");
      return;
    }
    sessionRef.current = s;
    setSession(s);
    if (s.status === "finished") {
      setPhase("finished");
      return;
    }
    const last = s.messages[s.messages.length - 1];
    if (s.messages.length === 0 || last.role === "candidate") {
      void askNext(s);
    } else {
      setPhase("await");
    }
  }, []);
  // 新消息或流式增量到达时滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session, streamBuf]);
  const displayStream = streamBuf
    .replace(/^\s*<(新题|追问|结束)>\s*/, "")
    .split("#NOTES#")[0]
    .trimEnd();
  const chars = answer.trim().length;

  if (phase === "loading") {
    return <p className="py-20 text-center text-slate-400">加载中…</p>;
  }
  if (phase === "notfound") {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">会话不存在或已被删除。</p>
        <Link href="/" className="mt-3 inline-block text-blue-600 hover:underline">
          回首页
        </Link>
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-bold">
            {jobFamilyLabel(session.jobFamily)} · {interviewTypeLabel(session.interviewType)}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            第 {session.currentQuestionIndex || "-"} 题,共 {TOTAL_QUESTIONS} 题 · 当前题已追问 {session.followups} 次
          </p>
        </div>
        {phase !== "finished" ? (
          <button
            onClick={finishNow}
            disabled={reportBusy}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            结束并出报告
          </button>
        ) : (
          <Link href="/history" className="text-xs text-slate-500 hover:underline">
            去历史记录 →
          </Link>
        )}
      </div>

      {banner && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {banner}
          <button
            onClick={() => {
              const s = sessionRef.current;
              if (s) void askNext(s);
            }}
            className="ml-2 font-semibold underline"
          >
            重新出题
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col rounded-2xl bg-white shadow-sm lg:col-span-2">
          <div ref={scrollRef} className="thin-scroll h-[56vh] overflow-y-auto p-4">
            {session.messages.map((m) => (
              <div key={m.id} className={`mb-3 flex ${m.role === "candidate" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.kind === "closing"
                      ? "border border-emerald-300 bg-emerald-50 text-slate-800"
                      : m.role === "candidate"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.content}
                  {m.role === "interviewer" && (
                    <button
                      onClick={() => speak(m.content)}
                      className="mt-1.5 block text-[10px] text-slate-400 hover:text-blue-600"
                      title="朗读本题"
                    >
                      🔊 朗读
                    </button>
                  )}
                </div>
              </div>
            ))}
            {phase === "asking" && (
              <div className="mb-3 flex justify-start">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-800">
                  {displayStream || "…"}
                  <span className="ml-0.5 inline-block h-4 w-2 animate-pulse align-middle bg-slate-400" />
                </div>
              </div>
            )}
          </div>

          {phase === "await" && (
            <div className="border-t border-slate-100 p-4">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="输入你的回答…(Ctrl+Enter 快捷提交)"
                rows={4}
                className="thin-scroll w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void submitAnswer();
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {chars} 字 ≈ {estimateSeconds(answer)} 秒(200 字 ≈ 1 分钟)
                </span>
                <button
                  onClick={() => void submitAnswer()}
                  disabled={chars === 0}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  提交回答
                </button>
              </div>
            </div>
          )}
          {phase === "asking" && (
            <div className="border-t border-slate-100 p-4 text-center text-sm text-slate-400">
              面试官输出中…(逐题点评并行生成)
            </div>
          )}
          {phase === "finished" && (
            <div className="flex items-center justify-between border-t border-slate-100 p-4">
              <span className="text-sm text-slate-500">本场面试已结束</span>
              <div className="flex gap-2">
                {session.report ? (
                  <Link
                    href={`/report?id=${session.id}`}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    查看复盘报告
                  </Link>
                ) : (
                  <button
                    onClick={() => void generateReport()}
                    disabled={reportBusy}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {reportBusy ? "生成中…" : "生成复盘报告"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ScoreCard
            grade={gradeState.grade}
            loading={gradeState.loading}
            error={gradeState.error}
            questionIndex={session.currentQuestionIndex}
            onRetry={retryGrade}
          />
          <div className="rounded-2xl bg-white p-4 text-xs leading-relaxed text-slate-500 shadow-sm">
            <p className="font-semibold text-slate-600">玩法说明</p>
            <p className="mt-1">· 每题至少一次追问,答完先点评再追问/换题</p>
            <p>· 共 5 题,答完自动生成复盘报告</p>
            <p>· 中途关掉页面没关系,历史记录里可续练</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
import ChatBubble from "@/components/ChatBubble";
import SessionGradesHistory from "@/components/SessionGradesHistory";
import { Skeleton, ScoreCardSkeleton } from "@/components/Skeleton";
import {
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Loader,
  ArrowRight,
} from "@/components/icons";

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
  // 正在朗读的消息 id(TTS 状态可视化,I4);纯 UI 状态,不参与业务状态机
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  // speakingId 的 ref 镜像(A-4):onToggleSpeak 读 ref 判断"再点一次停止",
  // 才能做成 useCallback([]) 引用稳定,ChatBubble 的 memo 才不被新函数引用打穿
  const speakingIdRef = useRef<string | null>(null);

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
  // A-1:提交清空不走 onChange,需在提交流程里手动重置 textarea 内联高度
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // A-2:用户是否停在对话底部附近(距底 ≤ 80px);仅贴底时流式输出才自动跟滚
  const stickToBottomRef = useRef(true);

  // speakingId 的 ref + state 双写:ref 供稳定回调读取,state 驱动仅对应气泡重渲
  function setSpeakingBoth(id: string | null) {
    speakingIdRef.current = id;
    setSpeakingId(id);
  }

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

  // TTS 朗读(浏览器自带 speechSynthesis,零依赖)。speakId 用于按钮态可视化,再点一次停止。
  // useCallback([]) 引用稳定(A-4):依赖全部走 ref,否则每次渲染新函数会打穿 ChatBubble 的 memo
  const onToggleSpeak = useCallback((speakId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    // 同一条再点一次 = 停止朗读
    if (speakingIdRef.current === speakId) {
      synth.cancel();
      setSpeakingBoth(null);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 1.0;
    u.onend = () => {
      if (speakingIdRef.current === speakId) setSpeakingBoth(null);
    };
    u.onerror = () => {
      if (speakingIdRef.current === speakId) setSpeakingBoth(null);
    };
    setSpeakingBoth(speakId);
    synth.speak(u);
  }, []);
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
    // A-1:清空不触发 onChange,内联高度会残留 220px,这里手动回落到 rows=4 默认高度
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
  // 新消息或流式增量到达时滚到底部 —— 仅当用户本来就停在底部附近(A-2)。
  // 上翻看历史时不被强拉回底;手动滚回底部(距底 ≤ 80px)后恢复跟滚。纯 UI 行为,不动业务状态机
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [session, streamBuf]);
  const displayStream = streamBuf
    .replace(/^\s*<(新题|追问|结束)>\s*/, "")
    .split("#NOTES#")[0]
    .trimEnd();
  const chars = answer.trim().length;

  if (phase === "loading") {
    return (
      <div className="space-y-4" aria-label="加载中">
        <Skeleton className="h-6 w-56" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-4 lg:col-span-2">
            <div className="space-y-3">
              <Skeleton className="h-16 w-[85%] rounded-2xl" />
              <Skeleton className="ml-auto h-12 w-[70%] rounded-2xl" />
              <Skeleton className="h-12 w-[80%] rounded-2xl" />
            </div>
          </div>
          <ScoreCardSkeleton className="rounded-2xl border border-line bg-surface p-4" />
        </div>
      </div>
    );
  }
  if (phase === "notfound") {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-secondary">会话不存在或已被删除。</p>
        <Link href="/" className="mt-3 inline-block text-primary hover:underline">
          回首页
        </Link>
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">
            {jobFamilyLabel(session.jobFamily)} · {interviewTypeLabel(session.interviewType)}
          </h1>
          <p className="mt-1 text-xs text-ink-tertiary">
            第 {session.currentQuestionIndex || "-"} 题 · 共 {TOTAL_QUESTIONS} 题 · 当前题已追问 {session.followups} 次
          </p>
        </div>
        {phase !== "finished" ? (
          <button
            onClick={finishNow}
            disabled={reportBusy}
            className="no-print rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink-secondary transition hover:border-line-strong hover:bg-surface-muted disabled:opacity-50"
          >
            结束并出报告
          </button>
        ) : (
          <Link href="/history" className="text-xs text-ink-tertiary hover:underline">
            去历史记录 →
          </Link>
        )}
      </div>

      {/* I2 步骤进度条:5 题显性化(已完成实心 / 当前描边 / 未到置灰) */}
      <div
        className="flex items-center gap-1.5"
        role="img"
        aria-label={`进度:第 ${session.currentQuestionIndex || 0} 题,共 ${TOTAL_QUESTIONS} 题`}
      >
        {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => {
          const n = i + 1;
          const idx = session.currentQuestionIndex;
          const allDone = phase === "finished";
          const done = allDone || n < idx;
          const current = !allDone && n === idx;
          return (
            <div key={n} className="flex flex-1 items-center gap-1.5">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                  done
                    ? "bg-primary text-white"
                    : current
                      ? "bg-primary-soft text-primary ring-2 ring-primary/40"
                      : "bg-surface-inset text-ink-tertiary"
                }`}
              >
                {n}
              </span>
              {n < TOTAL_QUESTIONS && (
                <span className={`h-0.5 flex-1 rounded ${done ? "bg-primary" : "bg-line"}`} />
              )}
            </div>
          );
        })}
      </div>

      {banner && (
        <div className="fade-in flex items-start gap-2.5 rounded-xl border border-warn/40 bg-warn-soft px-4 py-2.5 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            {banner}
            <button
              onClick={() => {
                const s = sessionRef.current;
                if (s) void askNext(s);
              }}
              className="ml-2 rounded-md bg-warn px-2.5 py-1 text-xs font-semibold text-surface transition hover:opacity-90"
            >
              重新出题
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* G5:移动端评分卡提到对话上方(order-1),桌面端恢复右栏 */}
        <div className="order-2 flex flex-col rounded-2xl border border-line bg-surface shadow-sm lg:order-1 lg:col-span-2">
          <div
            ref={scrollRef}
            onScroll={() => {
              // A-2:记录用户是否停在底部附近(scrollHeight 增长不触发 scroll 事件,仅真实滚动更新)
              const el = scrollRef.current;
              if (el) {
                stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
              }
            }}
            className="thin-scroll h-[50vh] overflow-y-auto p-4 lg:h-[56vh]"
          >
            {session.messages.map((m) => (
              <ChatBubble
                key={m.id}
                m={m}
                isSpeaking={speakingId === m.id}
                onToggleSpeak={onToggleSpeak}
              />
            ))}
            {phase === "asking" && (
              <div className="bubble-in mb-3 flex items-end justify-start gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
                  title="面试官"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-surface-inset px-4 py-2.5 text-sm leading-relaxed text-ink">
                  {displayStream || "…"}
                  {/* I3 呼吸光标 */}
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse rounded-full bg-primary align-middle" />
                </div>
              </div>
            )}
          </div>

          {phase === "await" && (
            <div className="border-t border-line p-4">
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  // I6:自增高(上限 220px,超出内部滚动),替换固定 4 行
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
                }}
                placeholder="输入你的回答…(Ctrl+Enter 快捷提交)"
                rows={4}
                className="thin-scroll max-h-[220px] w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink transition placeholder:text-ink-tertiary focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void submitAnswer();
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs text-ink-tertiary">
                  <span className="rounded-md bg-surface-inset px-2 py-0.5 font-medium tabular-nums">{chars} 字</span>
                  ≈ {estimateSeconds(answer)} 秒(200 字 ≈ 1 分钟)
                </span>
                <button
                  onClick={() => void submitAnswer()}
                  disabled={chars === 0}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-40"
                >
                  提交回答
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {phase === "asking" && (
            <div className="fade-in flex items-center justify-center gap-2 border-t border-line p-4 text-center text-sm text-ink-tertiary">
              <Loader className="h-4 w-4" />
              面试官输出中…(逐题点评并行生成)
            </div>
          )}
          {phase === "finished" && (
            <div className="fade-in flex flex-wrap items-center justify-between gap-2 border-t border-line bg-gradient-to-r from-primary-soft to-surface px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-ink-secondary">
                <Sparkles className="h-4 w-4 text-primary" />
                本场面试已结束
              </span>
              <div className="flex gap-2">
                {session.report ? (
                  <Link
                    href={`/report?id=${session.id}`}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4" />
                    查看复盘报告
                  </Link>
                ) : (
                  <button
                    onClick={() => void generateReport()}
                    disabled={reportBusy}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                  >
                    {reportBusy ? (
                      <>
                        <Loader className="h-4 w-4" />
                        生成中…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        生成复盘报告
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="order-1 space-y-4 lg:order-2">
          <ScoreCard
            grade={gradeState.grade}
            loading={gradeState.loading}
            error={gradeState.error}
            questionIndex={session.currentQuestionIndex}
            onRetry={retryGrade}
          />
          {/* A-3:本场点评回顾(折叠),答到后面也能回看前面题目的点评 */}
          <SessionGradesHistory grades={session.grades} />
          <div className="rounded-2xl border border-line bg-surface p-4 text-xs leading-relaxed text-ink-secondary shadow-sm">
            <p className="font-semibold text-ink">玩法说明</p>
            <p className="mt-1">· 每题至少一次追问,答完先点评再追问/换题</p>
            <p>· 共 5 题,答完自动生成复盘报告</p>
            <p>· 中途关掉页面没关系,历史记录里可续练</p>
          </div>
        </div>
      </div>
    </div>
  );
}

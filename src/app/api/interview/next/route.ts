// 流式出题/追问:POST /api/interview/next
// 服务端无状态,由客户端传完整对话历史与进度;服务端拼系统提示词后转发 GLM 流
import { openStreamChat, type LlmMessage } from "@/lib/glm";
import { interviewerSystemPrompt } from "@/lib/prompts";
import { InterviewHistoryItem, JobFamily, TOTAL_QUESTIONS, isInterviewType } from "@/lib/types";

interface NextBody {
  sessionId?: string;
  jobFamily?: string;
  interviewType?: string;
  history?: InterviewHistoryItem[];
  forceContinue?: boolean;
  contextText?: string;
  hiddenNotes?: string[];
  model?: string;
  byokKey?: string;
  progress?: { questionIndex?: number; followups?: number };
}

const isJobFamily = (v: unknown): v is JobFamily =>
  v === "frontend" || v === "operations" || v === "general";

function clampInt(n: unknown, min: number, max: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export async function POST(req: Request) {
  let body: NextBody;
  try {
    body = (await req.json()) as NextBody;
  } catch {
    return new Response("请求体不是 JSON", { status: 400 });
  }

  const jobFamily = isJobFamily(body?.jobFamily) ? body.jobFamily : "general";
  const interviewType = isInterviewType(body?.interviewType) ? body.interviewType : "behavioral";
  const history = Array.isArray(body?.history) ? body!.history! : [];
  const qIndex = clampInt(body?.progress?.questionIndex ?? 0, 0, TOTAL_QUESTIONS);
  const followups = clampInt(body?.progress?.followups ?? 0, 0, 10);

  const sys = interviewerSystemPrompt(
    jobFamily,
    interviewType,
    typeof body?.contextText === "string" ? body.contextText : undefined,
    Array.isArray(body?.hiddenNotes)
      ? body.hiddenNotes.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 20)
      : undefined
  );
  const messages: LlmMessage[] = [{ role: "system", content: sys }];

  if (history.length === 0) {
    messages.push({
      role: "user",
      content: `(系统内部注:面试刚开始,请出第 1 题,第一行输出 <新题>)`,
    });
  } else {
    // 强制续出指令:模型曾提前收尾,这次必须继续出题
    const forceNote = body?.forceContinue
      ? `注意:面试尚未结束,${TOTAL_QUESTIONS} 题还没问完,严禁输出 <结束>,必须立即输出 <新题> 继续。`
      : "";
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      const isLast = i === history.length - 1;
      // 进度指令合并进最后一条用户消息,保证消息角色严格交替
      const content =
        isLast && h.role === "candidate"
          ? `${h.content}\n\n(系统内部注:当前第 ${qIndex}/${TOTAL_QUESTIONS} 题,该题已追问 ${followups} 次。请给出你的下一句话,第一行输出标签 <追问>、<新题> 或 <结束>。${forceNote})`
          : h.content;
      messages.push({ role: h.role === "candidate" ? "user" : "assistant", content });
    }
  }

  try {
    const stream = await openStreamChat(messages, 0.85, {
      modelId: typeof body?.model === "string" ? body.model : undefined,
      byokKey: typeof body?.byokKey === "string" ? body.byokKey : undefined,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知错误";
    return new Response(`调用大模型失败:${msg}`, { status: 502 });
  }
}

// 复盘报告:POST /api/interview/report
// 数字部分(每题得分表/雷达均值)由服务端从 grades 确定性计算,不走模型;
// 模型只产出 summary/weakness/redLines/practiceTomorrow 文本,解析失败有确定性兜底
import { callJson } from "@/lib/glm";
import { reportSystemPrompt } from "@/lib/prompts";
import { Grade, InterviewHistoryItem, JobFamily, ReportData, ReportRow } from "@/lib/types";
import { avgDims, buildRows } from "@/lib/scoring";

interface ReportBody {
  jobFamily?: string;
  interviewType?: string;
  history?: InterviewHistoryItem[];
  grades?: Grade[];
  hiddenNotes?: string[];
  model?: string;
  byokKey?: string;
}

const isJobFamily = (v: unknown): v is JobFamily =>
  v === "frontend" || v === "operations" || v === "general";

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, max);
}

export async function POST(req: Request) {
  let body: ReportBody;
  try {
    body = (await req.json()) as ReportBody;
  } catch {
    return Response.json({ ok: false, message: "请求体不是 JSON" }, { status: 400 });
  }

  const jobFamily: JobFamily = isJobFamily(body?.jobFamily) ? body.jobFamily : "general";
  const interviewType = body?.interviewType === "technical" ? "专业面" : "行为面";
  const grades = Array.isArray(body?.grades) ? body!.grades! : [];

  const rows: ReportRow[] = buildRows(grades);
  if (rows.length === 0) {
    return Response.json({ ok: false, message: "没有可用的逐题评分数据" }, { status: 400 });
  }
  const radar = avgDims(rows);

  // 面试官隐藏笔记:评分依据,随逐题数据一并交给复盘提示词
  const notes = Array.isArray(body?.hiddenNotes)
    ? body!.hiddenNotes!.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const notesSection =
    notes.length > 0
      ? `\n面试官隐藏笔记(候选人不可见的诊断依据):\n${notes.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
      : "";

  // 给模型的材料:每题问题 + 回答节选 + 四维分 + 追问次数
  const material = rows.map((r) => {
    const g =
      grades
        .filter((x) => x.questionIndex === r.index && x.scores)
        .sort((a, b) => b.ts - a.ts)[0] ?? null;
    return {
      index: r.index,
      question: r.question,
      answerExcerpt: (g?.answer ?? "").slice(0, 400),
      scores: r.scores,
      followups: r.followups,
    };
  });

  const messages = [
    { role: "system" as const, content: reportSystemPrompt() },
    {
      role: "user" as const,
      content: `练习方向:${jobFamily};面试类型:${interviewType}。
逐题数据(JSON):
${JSON.stringify(material, null, 2)}
${notesSection}
请产出复盘文本部分。`,
    },
  ];

  interface LlmReport {
    summary: unknown;
    weakness: unknown;
    redLines: unknown;
    practiceTomorrow: unknown;
  }

  const validate = (d: unknown): LlmReport | null => {
    if (typeof d !== "object" || d === null) return null;
    const o = d as Record<string, unknown>;
    return {
      summary: o.summary,
      weakness: o.weakness,
      redLines: o.redLines,
      practiceTomorrow: o.practiceTomorrow,
    };
  };

  const opts = {
    modelId: typeof body?.model === "string" ? body.model : undefined,
    byokKey: typeof body?.byokKey === "string" ? body.byokKey : undefined,
  };

  try {
    const { data, parsed } = await callJson<LlmReport>(messages, validate, opts);

    if (parsed && data) {
      const report: ReportData = {
        rows,
        radar,
        summary: asString(data.summary) || "本场面试已完成。",
        weakness: asString(data.weakness),
        redLines: asStringArray(data.redLines, 3),
        practiceTomorrow: asStringArray(data.practiceTomorrow, 3),
        parsed: true,
      };
      return Response.json({ ok: true, ...report });
    }

    // 降级:确定性兜底(任务书第 5 节:解析失败降级并标注)

  // 降级:确定性兜底(任务书第 5 节:解析失败降级并标注)
  const dims: Array<{ label: string; value: number }> = [
    { label: "表达结构", value: radar.structure },
    { label: "内容量化", value: radar.quantification },
    { label: "口语化程度", value: radar.colloquial },
    { label: "答题时长", value: radar.duration },
  ].sort((a, b) => a.value - b.value);
  const weakest = dims[0];
  const report: ReportData = {
    rows,
    radar,
    summary: "复盘文本生成失败(模型输出解析失败),以下为系统兜底结论。",
    weakness: `最弱维度是「${weakest.label}」,平均 ${weakest.value} 分,建议针对性补强。`,
    redLines: [],
    practiceTomorrow: [],
    parsed: false,
  };
  return Response.json({ ok: true, ...report });
  } catch (e) {
    return Response.json(
      { ok: false, message: e instanceof Error ? e.message : "报告生成失败" },
      { status: 502 }
    );
  }
}

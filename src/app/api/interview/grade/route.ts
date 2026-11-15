// 逐题点评:POST /api/interview/grade → JSON 四维评分 + 点评
// 时长维度不走模型,按字数确定性计算;模型输出经钳制保证 1-5 整数
import { callJson } from "@/lib/glm";
import { gradeSystemPrompt } from "@/lib/prompts";
import { JobFamily } from "@/lib/types";
import { clampScore, durationScore, estimateSeconds } from "@/lib/scoring";

const isJobFamily = (v: unknown): v is JobFamily =>
  v === "frontend" || v === "operations" || v === "general";

export async function POST(req: Request) {
  let body: {
    question?: string;
    answer?: string;
    jobFamily?: string;
    model?: string;
    byokKey?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, message: "请求体不是 JSON" }, { status: 400 });
  }

  const question = (body?.question ?? "").trim();
  const answer = (body?.answer ?? "").trim();
  if (!question || !answer) {
    return Response.json({ ok: false, message: "question/answer 不能为空" }, { status: 400 });
  }
  const jobFamily: JobFamily = isJobFamily(body?.jobFamily) ? body.jobFamily : "general";
  const opts = {
    modelId: typeof body?.model === "string" ? body.model : undefined,
    byokKey: typeof body?.byokKey === "string" ? body.byokKey : undefined,
  };

  const messages = [
    { role: "system" as const, content: gradeSystemPrompt(jobFamily) },
    {
      role: "user" as const,
      content: `候选人的问题:\n${question}\n\n候选人的回答:\n${answer}\n\n请按格式点评。`,
    },
  ];

  interface LlmGrade {
    structure: unknown;
    quantification: unknown;
    colloquial: unknown;
    hits: unknown;
    gaps: unknown;
    view: unknown;
  }

  const validate = (d: unknown): LlmGrade | null => {
    if (typeof d !== "object" || d === null) return null;
    const o = d as Record<string, unknown>;
    if (o.structure === undefined || o.quantification === undefined || o.colloquial === undefined) {
      return null;
    }
    return {
      structure: o.structure,
      quantification: o.quantification,
      colloquial: o.colloquial,
      hits: o.hits,
      gaps: o.gaps,
      view: o.view,
    };
  };

  try {
    const { data, raw, parsed } = await callJson<LlmGrade>(messages, validate, opts);

    if (!parsed || !data) {
      // 降级:返回纯文本并标注解析失败(任务书第 5 节)
      return Response.json({
        ok: true,
        parsed: false,
        raw,
        scores: null,
        hits: [],
        gaps: [],
        view: "",
        estimateSeconds: estimateSeconds(answer),
      });
    }

    const scores = {
      structure: clampScore(data.structure),
      quantification: clampScore(data.quantification),
      colloquial: clampScore(data.colloquial),
      duration: durationScore(answer),
    };

    return Response.json({
      ok: true,
      parsed: true,
      scores,
      hits: toStrArray(data.hits),
      gaps: toStrArray(data.gaps),
      view: typeof data.view === "string" ? data.view : "",
      estimateSeconds: estimateSeconds(answer),
    });
  } catch (e) {
    return Response.json(
      { ok: false, message: e instanceof Error ? e.message : "点评请求失败" },
      { status: 502 }
    );
  }
}

function toStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [] as string[];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 5);
}

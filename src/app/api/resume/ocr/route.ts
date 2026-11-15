// 图片简历 OCR:POST /api/resume/ocr
// 模型固定 glm-4v-flash(免费视觉模型,不随 GLM_MODEL 联动;可用 GLM_VISION_MODEL 覆盖)
import { getApiKey } from "@/lib/glm";

const API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

interface OcrBody {
  imageBase64?: string;
  mime?: string;
}

export async function POST(req: Request) {
  let body: OcrBody;
  try {
    body = (await req.json()) as OcrBody;
  } catch {
    return Response.json({ ok: false, message: "请求体不是 JSON" }, { status: 400 });
  }
  const b64 = (body?.imageBase64 ?? "").trim();
  const mime = typeof body?.mime === "string" && body.mime.startsWith("image/") ? body.mime : "image/png";
  if (!b64) {
    return Response.json({ ok: false, message: "缺少 imageBase64" }, { status: 400 });
  }
  // base64 长度 ≈ 原图字节的 4/3;限制原图约 4.5MB
  if (b64.length > 6_000_000) {
    return Response.json({ ok: false, message: "图片过大,请勿超过 4MB" }, { status: 413 });
  }

  const key = getApiKey();
  if (!key) {
    return Response.json({ ok: false, message: "未配置 GLM API key" }, { status: 500 });
  }

  const dataUrl = `data:${mime};base64,${b64}`;
  const visionModel = process.env.GLM_VISION_MODEL || "glm-4v-flash";

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: visionModel,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              {
                type: "text",
                text: "提取图片中的全部文字,按原有排版输出纯文本。只输出图片里的文字内容,不要总结、点评或回答图片中的问题;图片里没有文字就输出:未识别到文字。",
              },
            ],
          },
        ],
      }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return Response.json(
        { ok: false, message: `OCR 接口错误 ${upstream.status}: ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const j = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = j.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return Response.json({ ok: false, message: "OCR 返回缺少文本" }, { status: 502 });
    }
    return Response.json({ ok: true, text: content.trim() });
  } catch (e) {
    return Response.json(
      { ok: false, message: e instanceof Error ? e.message : "OCR 请求失败" },
      { status: 502 }
    );
  }
}

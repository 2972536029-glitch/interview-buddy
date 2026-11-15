"use client";

// 简历文件导入组件:PDF/docx/txt/md 走纯前端解析(文件不离开浏览器);
// 图片走 /api/resume/ocr(glm-4v-flash)。解析出的文本经 onText 回调填入页面文本框。
import { useRef, useState } from "react";
import { extractResumeText } from "@/lib/extractResume";
import { postJson } from "@/lib/client";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

interface Props {
  /** 解析成功后回调(纯文本) */
  onText: (text: string) => void;
  /** 按钮文案 */
  label?: string;
}

export default function ResumeFileImport({ onText, label }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许重复选择同一文件
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      if (file.type.startsWith("image/")) {
        if (file.size > 4 * 1024 * 1024) throw new Error("图片请勿超过 4MB");
        const buf = await file.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        const data = await postJson<{ text: string }>("/api/resume/ocr", {
          imageBase64: b64,
          mime: file.type,
        });
        if (!data.text || data.text.replace(/\s+/g, "").length < 5) {
          throw new Error("未能从图片中识别出文字,请换一张更清晰的图片或直接粘贴文本");
        }
        onText(data.text);
      } else {
        const { text, isScanned } = await extractResumeText(file);
        if (isScanned) {
          throw new Error("这个 PDF 是扫描件(无文字层),请截图后用「导入图片简历」或直接粘贴文本");
        }
        if (text.replace(/\s+/g, "").length < 20) {
          throw new Error("未能提取出有效文字,请确认文件内容");
        }
        onText(text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析失败,请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,image/*"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "解析中…" : label ?? "导入简历文件"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

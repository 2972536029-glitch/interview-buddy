// 简历文件文本提取:PDF(pdf.js)/ docx(mammoth)/ txt、md。
// 设计约定:
// 1) 纯前端解析,简历文件不离开浏览器(OCR 图片路径除外,见 api/resume/ocr);
// 2) 函数接收二进制数据而非 File 对象,同一逻辑可在 Node 侧直接测试;
// 3) pdf.js 按需动态加载,不进 SSR 初始包。
export interface ExtractResult {
  text: string;
  /** true = PDF 无文字层(扫描件),应引导用户改用图片 OCR 或粘贴文本 */
  isScanned?: boolean;
}

/** 从 pdf.js 文本项重建行(利用 hasEOL 标记) */
function joinPdfItems(items: Array<{ str?: unknown; hasEOL?: unknown }>): string {
  const lines: string[] = [];
  let line = "";
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    line += item.str;
    if (item.hasEOL === true) {
      lines.push(line);
      line = "";
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      pages.push(joinPdfItems(tc.items as Array<{ str?: unknown; hasEOL?: unknown }>));
    }
    return pages.join("\n").trim();
  } finally {
    await loadingTask.destroy();
  }
}

export async function extractDocxText(data: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const mod = mammoth as unknown as {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
  };
  const result = await mod.extractRawText({ arrayBuffer: data });
  return result.value.trim();
}

export function extractPlainText(data: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(data).trim();
}

export async function extractResumeText(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const text = await extractPdfText(new Uint8Array(buf));
    return { text, isScanned: text.replace(/\s+/g, "").length < 20 };
  }
  if (name.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    return { text: await extractDocxText(buf) };
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const buf = await file.arrayBuffer();
    return { text: extractPlainText(buf) };
  }
  throw new Error("仅支持 PDF / docx / txt / md / 图片,其他格式请粘贴文本");
}

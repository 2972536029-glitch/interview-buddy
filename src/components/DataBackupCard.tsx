"use client";

// 设置页「数据管理」卡片(任务书 C):导出/恢复 localStorage 里的 mdz.* 数据。
// 红线:不 import @/lib/*(含 storage.ts),直接 window.localStorage 读写;不新增任何 mdz.* 键。
import { useRef, useState } from "react";
import type { ChangeEvent, SVGProps } from "react";
import { Check, FileUp, XCircle } from "@/components/icons";

/** 下载图标(icons.tsx 没有且禁改,按红线在本组件内手写,风格与之对齐) */
function Download(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

type Msg = { kind: "error" | "success"; text: string };

/** 备份文件名:mdz-backup-YYYYMMDD-HHmm.json(本地时间) */
function backupFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
  const time = `${p(now.getHours())}${p(now.getMinutes())}`;
  return `mdz-backup-${date}-${time}.json`;
}

export default function DataBackupCard() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);

  function handleExport() {
    try {
      // 遍历 localStorage 收集 mdz.* 键;值保留原始字符串,导入时原样写回(不 parse 再 stringify)
      const entries: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith("mdz.")) {
          entries[key] = window.localStorage.getItem(key) ?? "";
        }
      }
      const payload = {
        app: "mian-dazi",
        version: 1,
        exportedAt: new Date().toISOString(),
        entries,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFileName(new Date());
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ kind: "success", text: `已导出 ${Object.keys(entries).length} 项数据,备份文件已开始下载` });
    } catch {
      // 隐私模式等场景下访问 localStorage 会直接抛错
      setMsg({ kind: "error", text: "当前浏览器不允许读取本地存储" });
    }
  }

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 无论后续成败都立刻清空,允许重复选择同一个文件
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => setMsg({ kind: "error", text: "文件读取失败,请重试" });
    reader.onload = () => {
      const badFormat = () =>
        setMsg({ kind: "error", text: "文件格式不对,请选择由面搭子导出的备份文件" });

      // 校验链 1:能被 JSON.parse
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch {
        badFormat();
        return;
      }

      // 校验链 2:结构——必须是对象,且带一个 entries 对象
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        badFormat();
        return;
      }
      const entries = (parsed as Record<string, unknown>).entries;
      if (typeof entries !== "object" || entries === null || Array.isArray(entries)) {
        badFormat();
        return;
      }

      // 校验链 3:安全——每个键必须以 mdz. 开头(值必须是字符串,自家导出的备份必然如此),
      // 有一个不合法就整包拒绝,防止把任意键写进用户 localStorage
      const toWrite: Record<string, string> = {};
      for (const [key, value] of Object.entries(entries)) {
        if (!key.startsWith("mdz.")) {
          setMsg({ kind: "error", text: "备份文件包含未知数据,已取消导入" });
          return;
        }
        if (typeof value !== "string") {
          badFormat();
          return;
        }
        toWrite[key] = value;
      }

      // 二次确认:同键整体覆盖(sessions 数组整体替换),不做合并
      const ok = window.confirm("将用备份覆盖当前全部练习记录、诊断结果与设置,确定继续吗?");
      if (!ok) return; // 取消 → 零写入

      try {
        for (const [key, value] of Object.entries(toWrite)) {
          window.localStorage.setItem(key, value);
        }
      } catch {
        setMsg({ kind: "error", text: "当前浏览器不允许写入本地存储" });
        return;
      }
      setMsg({ kind: "success", text: "导入成功,正在刷新…" });
      // 留半秒让提示渲染出来再刷新
      setTimeout(() => window.location.reload(), 500);
    };
    reader.readAsText(file);
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="font-bold">数据管理</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
        练习记录、诊断结果与设置都只保存在本机浏览器(localStorage),清缓存或换浏览器会丢失,建议定期导出备份。
        备份文件包含模型设置(含 DeepSeek Key,若填过),请妥善保管,不要发给别人。
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2 font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          导出备份
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-xl border border-warn/50 px-6 py-2 font-semibold text-warn transition hover:bg-warn-soft active:scale-[0.98]"
        >
          <FileUp className="h-4 w-4" />
          导入恢复
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      <p className="mt-3 text-xs text-ink-tertiary">
        导入会用备份整体覆盖当前同名的数据(不合并),完成后页面自动刷新。
      </p>

      {msg && (
        <p
          className={`fade-in mt-3 flex items-center gap-1.5 text-sm font-medium ${
            msg.kind === "error" ? "text-danger" : "text-success"
          }`}
        >
          {msg.kind === "error" ? (
            <XCircle className="h-4 w-4 shrink-0" />
          ) : (
            <Check className="h-4 w-4 shrink-0" />
          )}
          {msg.text}
        </p>
      )}
    </section>
  );
}

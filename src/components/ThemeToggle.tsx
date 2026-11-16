"use client";

// 主题切换(G4+):浅色 → 深色 → 跟随系统 三态循环
// 偏好存独立 UI 层键 mdz.theme.v1;不碰 lib/models 的 mdz.settings.v1(红线:lib 冻结)
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "./icons";

type ThemeMode = "light" | "dark" | "system";

const KEY = "mdz.theme.v1";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (mode === "light" || mode === "dark") root.classList.add(mode);
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  // 挂载后读取已存偏好(与 head 内联脚本双保险,脚本负责首帧无闪烁)
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(KEY);
    } catch {
      stored = null;
    }
    const m = stored === "light" || stored === "dark" ? (stored as ThemeMode) : "system";
    setMode(m);
    applyTheme(m);
  }, []);

  function cycle() {
    const next: ThemeMode = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    setMode(next);
    applyTheme(next);
    try {
      if (next === "system") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, next);
    } catch {
      // localStorage 不可用时静默降级为仅本次会话生效
    }
  }

  const icon =
    mode === "light" ? <Sun className="h-4 w-4" /> : mode === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;
  const label = mode === "light" ? "亮色" : mode === "dark" ? "暗色" : "跟随系统";

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition hover:bg-surface-inset hover:text-ink"
      title={`主题:${label}(点击切换)`}
      aria-label={`主题:${label},点击切换`}
    >
      {icon}
    </button>
  );
}

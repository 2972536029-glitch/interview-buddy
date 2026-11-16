"use client";

// 全局导航(G1):当前路由高亮 + 图标。仅视觉层,无业务逻辑
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { FileText, Clock, SettingsIcon } from "./icons";

const NAV_ITEMS: Array<{ href: string; label: string; icon: (p: { className?: string }) => ReactElement }> = [
  { href: "/", label: "首页", icon: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={p.className}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg> },
  { href: "/resume", label: "简历诊断", icon: FileText },
  { href: "/history", label: "历史记录", icon: Clock },
  { href: "/settings", label: "设置", icon: SettingsIcon },
];

export default function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition sm:px-3 ${
              active
                ? "bg-primary-soft font-semibold text-primary"
                : "text-ink-secondary hover:bg-surface-inset hover:text-ink"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {/* G5:375px 窄屏只留图标,标签 sm 起显示 */}
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

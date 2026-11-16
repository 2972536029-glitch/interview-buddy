"use client";

// 移动端底部导航(B-2):sm 以下固定底部 tab bar,sm 及以上隐藏(header 导航接管)
// 无子路由,active 一律 pathname 精确等值(含首页 "/")
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { Home, FileText, Clock, SettingsIcon } from "./icons";

const TAB_ITEMS: Array<{ href: string; label: string; icon: (p: { className?: string }) => ReactElement }> = [
  { href: "/", label: "首页", icon: Home },
  { href: "/resume", label: "简历诊断", icon: FileText },
  { href: "/history", label: "历史记录", icon: Clock },
  { href: "/settings", label: "设置", icon: SettingsIcon },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="主导航"
      className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      {TAB_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition ${
              active ? "font-semibold text-primary" : "text-ink-secondary hover:text-ink"
            }`}
          >
            {/* 当前项:主色小胶囊包图标 + 文字 text-primary */}
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                active ? "bg-primary-soft" : ""
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

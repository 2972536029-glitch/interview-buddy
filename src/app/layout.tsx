import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import ThemeToggle from "@/components/ThemeToggle";
import BottomTabBar from "@/components/BottomTabBar";
import { LogoMark } from "@/components/icons";

export const metadata: Metadata = {
  title: "面搭子 — AI 模拟面试与简历诊断",
  description: "给大学生的 AI 模拟面试 + 简历诊断工具:MVP",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};

// Next 15 规范:viewport 独立导出,不塞进 metadata;viewportFit cover 配合底部安全区
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#312e81" },
  ],
};

// 首帧前应用已存主题,避免暗/亮闪烁(FOUC);html 上的 class 由脚本写入,故加 suppressHydrationWarning
const themeInitScript = `(function(){try{var m=localStorage.getItem("mdz.theme.v1");if(m==="light"||m==="dark"){var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(m);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      {/* B-2:sm 以下给固定底部 tab bar 留出空间(64px + 刘海屏安全区),footer 随之上移不被遮挡 */}
      <body className="flex min-h-screen flex-col bg-page text-ink pb-[calc(4rem_+_env(safe-area-inset-bottom))] sm:pb-0">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <LogoMark className="h-7 w-7 shrink-0 text-primary" />
              <span className="whitespace-nowrap text-lg font-bold tracking-wide">面搭子</span>
              <span className="whitespace-nowrap rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
                MVP
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <SiteNav />
              <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" aria-hidden />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="no-print pb-6 pt-2 text-center text-xs text-ink-tertiary">
          面搭子 MVP · 数据仅存本机浏览器 localStorage,不设服务器存储
        </footer>
        <BottomTabBar />
      </body>
    </html>
  );
}

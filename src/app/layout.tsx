import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "面搭子 — AI 模拟面试与简历诊断",
  description: "给大学生的 AI 模拟面试 + 简历诊断工具:MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="text-lg font-bold tracking-wide">
              面搭子
              <span className="ml-1.5 align-middle text-xs font-normal text-slate-400">MVP</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-slate-600">
              <Link href="/" className="hover:text-blue-600">
                首页
              </Link>
              <Link href="/resume" className="hover:text-blue-600">
                简历诊断
              </Link>
              <Link href="/history" className="hover:text-blue-600">
                历史记录
              </Link>
              <Link href="/settings" className="hover:text-blue-600">
                设置
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="pb-6 pt-2 text-center text-xs text-slate-400">
          面搭子 MVP · 数据仅存本机浏览器 localStorage,不设服务器存储
        </footer>
      </body>
    </html>
  );
}

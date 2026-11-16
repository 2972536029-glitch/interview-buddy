import type { Config } from "tailwindcss";

/**
 * 设计 token(唯一色值来源,页面一律引用语义类,禁止散落硬编码)
 *
 * 实现方式:语义色 = rgb(var(--mdz-*) / <alpha-value>),
 * 变量本体在 src/app/globals.css 的 :root(亮色)与 @media (prefers-color-scheme: dark)(暗色)定义。
 * 好处:全站换肤/暗色模式只改变量,页面零改动;<alpha-value> 让 bg-primary/50 这类透明度写法可用。
 */
const token = (name: string) => `rgb(var(--mdz-${name}) / <alpha-value>)`;

export default {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色(靛蓝):按钮/链接/选中态
        primary: {
          DEFAULT: token("primary"),
          hover: token("primary-hover"),
          soft: token("primary-soft"),
          "soft-hover": token("primary-soft-hover"),
        },
        // 表面:页面底色 / 卡片 / 卡内浅色块
        page: token("page"),
        surface: {
          DEFAULT: token("surface"),
          muted: token("surface-muted"),
          inset: token("surface-inset"),
        },
        // 线:边框/分隔线
        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
        },
        // 墨:文字三级
        ink: {
          DEFAULT: token("ink"),
          secondary: token("ink-secondary"),
          tertiary: token("ink-tertiary"),
        },
        // 语义色:危险(红线/删除/低分)、成功(命中/高分)、警告(提示/中低分)
        danger: {
          DEFAULT: token("danger"),
          soft: token("danger-soft"),
        },
        success: {
          DEFAULT: token("success"),
          soft: token("success-soft"),
        },
        warn: {
          DEFAULT: token("warn"),
          soft: token("warn-soft"),
        },
      },
      // 中文字体栈(G3):显式声明,Windows/macOS 都落到各自的中文衬线替代
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          "sans-serif",
        ],
      },
      // 微交互统一时长(G7):150-250ms 区间
      transitionDuration: {
        DEFAULT: "180ms",
      },
    },
  },
  plugins: [],
} satisfies Config;

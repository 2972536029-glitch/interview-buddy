// 内联 SVG 图标集(lucide 风格手写 stroke 图标,不引任何组件库 —— 任务书红线 3)
// 统一约定:currentColor 描边、24 viewBox、className 控制尺寸与颜色
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

/** 品牌 logo:圆角方块内的对话气泡 */
export function LogoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" />
      <path
        d="M7.2 10.2c0-1.1.9-2 2-2h5.6c1.1 0 2 .9 2 2v3.1c0 1.1-.9 2-2 2h-2.6L9.6 17c-.5.3-1.2-.1-1.2-.7v-1.2c-.7-.3-1.2-.9-1.2-1.7v-3.2z"
        fill="#fff"
      />
    </svg>
  );
}

/** 音量(朗读按钮) */
export function Volume2(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

/** 停止(正在朗读时显示) */
export function Square(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}

/** 用户(候选人头像) */
export function User(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5" />
    </svg>
  );
}

/** 面试官头像:对话气泡 */
export function MessageSquare(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5h16v10H9l-5 4v-14z" />
    </svg>
  );
}

/** 选中态对勾 */
export function Check(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12.5l4.5 4.5L19.5 7" />
    </svg>
  );
}

/** 警示三角(红线预警/错误 banner) */
export function AlertTriangle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 22 20H2L12 3.5z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.2" r="0.4" />
    </svg>
  );
}

/** 靶心(薄弱点) */
export function Target(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

/** 清单(明天练什么) */
export function ClipboardList(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2.5h6v3H9z" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  );
}

/** 箭头(主 CTA) */
export function ArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/** 文件导入 */
export function FileUp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 21h12a2 2 0 0 0 2-2v-9H4v9a2 2 0 0 0 2 2z" />
      <path d="M4 10V5a2 2 0 0 1 2-2h8l6 6" fill="none" />
      <path d="M12 16v-5M9.5 13.5 12 11l2.5 2.5" />
    </svg>
  );
}

/** 删除(历史页,弱化图标按钮) */
export function Trash2(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6.5 7l1 13h9l1-13" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

/** 趋势(历史曲线/最近练习) */
export function TrendingUp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

/** 设置(齿轮) */
export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5" />
    </svg>
  );
}

/** 加载 spinner(圆弧) */
export function Loader(props: IconProps) {
  return (
    <svg {...base(props)} className={`animate-spin ${props.className ?? ""}`}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

/** 错误(圆形叉) */
export function XCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

/** 文档(简历诊断) */
export function FileText(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 21h12a2 2 0 0 0 2-2V8l-6-6H8a2 2 0 0 1-2 2v15a2 2 0 0 0 2 2z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

/** 时钟(历史/进行中) */
export function Clock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

/** 星火(报告生成按钮) */
export function Sparkles(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

/** 太阳(亮色模式) */
export function Sun(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8M18.6 18.6l-1.8-1.8M7.2 7.2L5.4 5.4" />
    </svg>
  );
}

/** 月亮(暗色模式) */
export function Moon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  );
}

/** 显示器(跟随系统) */
export function Monitor(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="18" height="12.5" rx="2" />
      <path d="M9 21h6M12 17.5V21" />
    </svg>
  );
}

/** 首页(底部导航);路径与 SiteNav 内联首页图标一致,两处导航视觉统一 */
export function Home(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

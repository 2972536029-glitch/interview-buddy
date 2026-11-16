// 环形总分(R1/D1):SVG 圆环进度 + 段位色与段位词(手写 SVG,不引图表库)
// 颜色走语义 token 类(stroke-primary 等),暗色自动适配
const RING = 2 * Math.PI * 42; // r=42 → 周长

/** 100 分制分数 → 段位(颜色 + 文案);纯展示派生,不动业务数据 */
function bandOf(score: number): { cls: string; label: string } {
  if (score >= 80) return { cls: "text-success", label: "优秀" };
  if (score >= 60) return { label: "良好", cls: "text-primary" };
  if (score >= 45) return { cls: "text-warn", label: "及格" };
  return { cls: "text-danger", label: "需加强" };
}

export default function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const band = bandOf(clamped);
  const dash = (clamped / 100) * RING;
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`总评分 ${clamped},段位 ${band.label}`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" className="stroke-line" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          className={band.cls.includes("success")
            ? "stroke-success"
            : band.cls.includes("warn")
              ? "stroke-warn"
              : band.cls.includes("danger")
                ? "stroke-danger"
                : "stroke-primary"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${RING - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${band.cls}`}>{clamped}</span>
        <span className="text-[10px] text-ink-tertiary">{band.label}</span>
      </div>
    </div>
  );
}

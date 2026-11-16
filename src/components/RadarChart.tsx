// 四维雷达图(手写 SVG,不引组件库 —— 任务书红线 3)
// 颜色走 Tailwind 语义 token 类(stroke-line / fill-primary 等),暗色模式自动适配
import { DimScores } from "@/lib/types";

const DIMS: Array<{ key: keyof DimScores; label: string }> = [
  { key: "structure", label: "表达结构" },
  { key: "quantification", label: "内容量化" },
  { key: "colloquial", label: "口语化" },
  { key: "duration", label: "答题时长" },
];

export default function RadarChart({ dims, size = 260 }: { dims: DimScores; size?: number }) {
  const cx = size / 2;
  const cy = size / 2 + 8;
  const R = size / 2 - 44;

  const angle = (i: number) => (Math.PI / 2) * i - Math.PI / 2;
  const pt = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ];
  const ringPoints = (v: number): string =>
    DIMS.map((_, i) => pt(i, (R * v) / 5).map((n) => n.toFixed(1)).join(",")).join(" ");
  const dataPoints = DIMS.map((d, i) =>
    pt(i, (R * Math.max(0, Math.min(5, dims[d.key] ?? 0))) / 5)
      .map((n) => n.toFixed(1))
      .join(",")
  ).join(" ");
  const avg =
    (["structure", "quantification", "colloquial", "duration"] as const).reduce(
      (sum, k) => sum + (dims[k] ?? 0),
      0
    ) / DIMS.length;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="四维雷达图">
      {[1, 2, 3, 4, 5].map((v) => (
        <polygon
          key={v}
          points={ringPoints(v)}
          fill="none"
          className={v === 5 ? "stroke-line-strong" : "stroke-line"}
          strokeWidth="1"
        />
      ))}
      {DIMS.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="stroke-line" strokeWidth="1" />;
      })}
      <polygon points={dataPoints} className="fill-primary/15 stroke-primary" strokeWidth="2" />
      {/* 数据顶点圆点,增强可读性 */}
      {DIMS.map((d, i) => {
        const [x, y] = pt(i, (R * Math.max(0, Math.min(5, dims[d.key] ?? 0))) / 5);
        return <circle key={d.key} cx={x} cy={y} r="3" className="fill-primary stroke-surface" strokeWidth="1.5" />;
      })}
      {/* 中心平均分 */}
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="10" className="fill-ink-tertiary">
        均分
      </text>
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="15" fontWeight="700" className="fill-primary">
        {avg.toFixed(1)}
      </text>
      {DIMS.map((d, i) => {
        const [x, y] = pt(i, R + 22);
        const value = dims[d.key] ?? 0;
        return (
          <g key={d.key}>
            <text x={x} y={y - 4} textAnchor="middle" fontSize="12" className="fill-ink-secondary">
              {d.label}
            </text>
            <text x={x} y={y + 12} textAnchor="middle" fontSize="13" fontWeight="700" className="fill-primary">
              {value.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

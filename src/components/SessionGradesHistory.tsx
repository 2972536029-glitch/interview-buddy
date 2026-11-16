// 本场点评回顾(A-3):ScoreCard 只显示最新一条,这里折叠展开回看本场全部逐题点评
// 数据只读 session.grades(引用仅在新增点评时变化),memo 避免流式期间右栏无谓重渲
import { memo } from "react";
import { DimScores, Grade } from "@/lib/types";

const DIMS: Array<{ key: keyof DimScores; label: string }> = [
  { key: "structure", label: "表达结构" },
  { key: "quantification", label: "内容量化" },
  { key: "colloquial", label: "口语化程度" },
  { key: "duration", label: "答题时长" },
];

// 分数色阶徽章:v>=4 绿 / v>=3 主色 / 其余琥珀(与报告页得分表同一套写法)
function scoreBadgeClass(v: number) {
  return v >= 4
    ? "bg-success-soft text-success"
    : v >= 3
      ? "bg-primary-soft text-primary"
      : "bg-warn-soft text-warn";
}

interface Props {
  grades: Grade[];
}

function SessionGradesHistory({ grades }: Props) {
  return (
    <details className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <summary className="flex cursor-pointer select-none items-center justify-between text-sm font-bold">
        本场点评回顾
        <span className="rounded-md bg-surface-inset px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-secondary">
          {grades.length} 条
        </span>
      </summary>
      <div className="mt-3">
        {grades.length === 0 ? (
          <p className="text-xs text-ink-tertiary">暂无点评,提交回答后自动生成</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {grades.map((g) => (
              <li key={g.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-xs font-semibold text-ink">
                  第 {g.questionIndex} 题 · 第 {g.followupNo + 1} 轮回答
                </p>
                {g.parsed && g.scores ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {DIMS.map((d) => {
                      const v = g.scores![d.key];
                      return (
                        <span
                          key={d.key}
                          className={`inline-flex h-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums ${scoreBadgeClass(v)}`}
                        >
                          {d.label} {v}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="mt-1.5 inline-flex h-6 items-center rounded-md bg-danger-soft px-2 text-xs font-semibold text-danger">
                    解析失败
                  </span>
                )}
                {g.gaps.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {g.gaps.slice(0, 2).map((gap, i) => (
                      <li key={i} className="text-xs leading-relaxed text-ink-secondary">
                        · {gap}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export default memo(SessionGradesHistory);

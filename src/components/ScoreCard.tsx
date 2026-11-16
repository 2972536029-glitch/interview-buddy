// 当前题四维评分卡(面试页右侧)
import { DimScores, Grade } from "@/lib/types";
import { estimateSeconds } from "@/lib/scoring";
import { Skeleton, ScoreCardSkeleton } from "./Skeleton";
import { AlertTriangle, Loader } from "./icons";

const DIMS: Array<{ key: keyof DimScores; label: string }> = [
  { key: "structure", label: "表达结构" },
  { key: "quantification", label: "内容量化" },
  { key: "colloquial", label: "口语化程度" },
  { key: "duration", label: "答题时长" },
];

interface Props {
  grade: Grade | null;
  loading: boolean;
  error: string | null;
  questionIndex: number;
  onRetry: (() => void) | null;
}

export default function ScoreCard({ grade, loading, error, questionIndex, onRetry }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">逐题点评 · 第 {questionIndex || "-"} 题</h3>
      </div>

      {/* I5:加载态用骨架屏替代纯文字"点评生成中…" */}
      {loading && (
        <div className="mt-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-tertiary">
            <Loader className="h-3.5 w-3.5" />
            点评生成中…
          </p>
          <ScoreCardSkeleton />
        </div>
      )}

      {!loading && error && (
        <div className="fade-in mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3">
          <p className="flex items-start gap-1.5 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            点评失败:{error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-surface transition hover:opacity-90"
            >
              重试点评
            </button>
          )}
        </div>
      )}

      {!loading && !error && !grade && (
        <p className="mt-4 text-sm text-ink-tertiary">提交回答后自动点评</p>
      )}

      {!loading && !error && grade && (
        <div className="fade-in mt-3 space-y-4">
          {grade.parsed && grade.scores && (
            <>
              <div className="space-y-2.5">
                {DIMS.map((d) => {
                  const v = grade.scores![d.key];
                  const vColor = v >= 4 ? "text-success" : v >= 3 ? "text-primary" : "text-warn";
                  return (
                    <div key={d.key} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-xs text-ink-secondary">{d.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-inset">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500"
                          style={{ width: `${(v / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-ink-tertiary">
                答题时长按字数估算:约 {estimateSeconds(grade.answer)} 秒(200 字 ≈ 1 分钟)
              </p>

              {grade.hits.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-success">命中</p>
                  <ul className="mt-1 space-y-1">
                    {grade.hits.map((h, i) => (
                      <li key={i} className="text-xs leading-relaxed text-ink-secondary">· {h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {grade.gaps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-warn">欠缺</p>
                  <ul className="mt-1 space-y-1">
                    {grade.gaps.map((g, i) => (
                      <li key={i} className="text-xs leading-relaxed text-ink-secondary">· {g}</li>
                    ))}
                  </ul>
                </div>
              )}
              {grade.view && (
                <div className="rounded-lg bg-surface-muted p-2.5">
                  <p className="text-xs font-semibold text-ink-secondary">面试官视角</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{grade.view}</p>
                </div>
              )}
            </>
          )}

          {!grade.parsed && (
            <div>
              <span className="inline-block rounded bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
                解析失败
              </span>
              {grade.raw && (
                <details>
                  <summary className="mt-2 cursor-pointer text-xs text-ink-tertiary">查看原始输出</summary>
                  <pre className="thin-scroll mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-surface-muted p-2 text-xs text-ink-secondary">
                    {grade.raw}
                  </pre>
                </details>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-surface transition hover:opacity-90"
                >
                  重试点评
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

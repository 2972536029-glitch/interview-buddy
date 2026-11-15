// 当前题四维评分卡(面试页右侧)
import { DimScores, Grade } from "@/lib/types";
import { estimateSeconds } from "@/lib/scoring";

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
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">逐题点评 · 第 {questionIndex || "-"} 题</h3>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-500">点评生成中…</p>}

      {!loading && error && (
        <div className="mt-4">
          <p className="text-sm text-red-600">点评失败:{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              重试点评
              </button>
          )}
        </div>
      )}

      {!loading && !error && !grade && (
        <p className="mt-4 text-sm text-slate-400">提交回答后自动点评</p>
      )}

      {!loading && !error && grade && (
        <div className="mt-3 space-y-4">
          {grade.parsed && grade.scores && (
            <>
              <div className="space-y-2">
                {DIMS.map((d) => {
                  const v = grade.scores![d.key];
                  return (
                    <div key={d.key} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-xs text-slate-500">{d.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${v >= 4 ? "bg-emerald-500" : v >= 3 ? "bg-blue-500" : "bg-amber-500"}`}
                          style={{ width: `${(v / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-4 text-right text-sm font-bold">{v}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">
                答题时长按字数估算:约 {estimateSeconds(grade.answer)} 秒(200 字 ≈ 1 分钟)
              </p>

              {grade.hits.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700">命中</p>
                  <ul className="mt-1 space-y-1">
                    {grade.hits.map((h, i) => (
                      <li key={i} className="text-xs leading-relaxed text-slate-600">· {h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {grade.gaps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700">欠缺</p>
                  <ul className="mt-1 space-y-1">
                    {grade.gaps.map((g, i) => (
                      <li key={i} className="text-xs leading-relaxed text-slate-600">· {g}</li>
                    ))}
                  </ul>
                </div>
              )}
              {grade.view && (
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-xs font-semibold text-slate-500">面试官视角</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{grade.view}</p>
                </div>
              )}
            </>
          )}

          {!grade.parsed && (
            <div>
              <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                解析失败
              </span>
              {grade.raw && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-slate-500">查看原始输出</summary>
                  <pre className="thin-scroll mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">
                    {grade.raw}
                  </pre>
                </details>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
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

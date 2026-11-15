// 评分辅助:时长按字数估算(任务书规定约 200 字 ≈ 1 分钟)、分数钳制、四维聚合
import { DimScores, Grade } from "./types";

/** 估算答题时长(秒) */
export function estimateSeconds(answer: string): number {
  return Math.round((answer.trim().length / 200) * 60);
}

/** 答题时长维度得分(确定性计算,不走模型):理想区间 160~500 字(约 1~2.5 分钟) */
export function durationScore(answer: string): number {
  const chars = answer.trim().length;
  if (chars < 60) return 1; // 不足 18 秒,信息量不够
  if (chars < 160) return 3; // 1 分钟内,偏短
  if (chars <= 500) return 5; // 理想区间
  if (chars <= 700) return 4; // 略超 2 分钟
  if (chars <= 900) return 3; // 超过 3 分钟,偏长
  return 2; // 过长
}

/** 任意模型输出 → 1-5 整数(防御式钳制) */
export function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 3;
  return Math.min(5, Math.max(1, v));
}

/** 每题取最后一条解析成功的点评,聚合成每行数据 */
export function buildRows(grades: Grade[]): ReportRowLike[] {
  const byQ = new Map<number, Grade>();
  for (const g of grades) {
    if (!g.scores) continue;
    const prev = byQ.get(g.questionIndex);
    if (!prev || g.ts >= prev.ts) byQ.set(g.questionIndex, g);
  }
  const rows = [...byQ.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, g]) => ({
      index,
      question: g.question,
      scores: g.scores as DimScores,
      followups: grades.filter((x) => x.questionIndex === index).length - 1,
    }));
  return rows;
}

export interface ReportRowLike {
  index: number;
  question: string;
  scores: DimScores;
  followups: number;
}

/** 四维平均分 */
export function avgDims(rows: ReportRowLike[]): DimScores {
  if (rows.length === 0) return { structure: 0, quantification: 0, colloquial: 0, duration: 0 };
  const sum = rows.reduce(
    (acc, r) => ({
      structure: acc.structure + r.scores.structure,
      quantification: acc.quantification + r.scores.quantification,
      colloquial: acc.colloquial + r.scores.colloquial,
      duration: acc.duration + r.scores.duration,
    }),
    { structure: 0, quantification: 0, colloquial: 0, duration: 0 }
  );
  const n = rows.length;
  return {
    structure: +(sum.structure / n).toFixed(1),
    quantification: +(sum.quantification / n).toFixed(1),
    colloquial: +(sum.colloquial / n).toFixed(1),
    duration: +(sum.duration / n).toFixed(1),
  };
}

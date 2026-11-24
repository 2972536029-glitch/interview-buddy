// 共享类型与岗位/面试类型目录(客户端、服务端共用)

export type JobFamily = "frontend" | "operations" | "general";
export type InterviewType = "behavioral" | "technical" | "hr" | "stress";

export const JOB_FAMILIES: ReadonlyArray<{
  id: JobFamily;
  label: string;
  desc: string;
}> = [
  { id: "frontend", label: "前端开发", desc: "性能优化 / 框架原理 / 工程化" },
  { id: "operations", label: "产品运营", desc: "增长案例 / 数据分析 / 用户调研" },
  { id: "general", label: "通用校招", desc: "还没定方向从这里开始 / 职业规划 / 软素质" },
];

export const INTERVIEW_TYPES: ReadonlyArray<{
  id: InterviewType;
  label: string;
  desc: string;
}> = [
  { id: "behavioral", label: "行为面", desc: "自我介绍 / 项目深挖 / 团队合作 / 挫折应对" },
  { id: "technical", label: "专业面", desc: "按练习方向出专业题" },
  { id: "hr", label: "HR 面", desc: "自我认知 / 价值观 / 稳定性 / 谈 offer" },
  { id: "stress", label: "压力面", desc: "质疑式追问 / 连续打假 / 抗压应变" },
];

export function jobFamilyLabel(id: string): string {
  return JOB_FAMILIES.find((f) => f.id === id)?.label ?? id;
}

export function interviewTypeLabel(id: string): string {
  return INTERVIEW_TYPES.find((t) => t.id === id)?.label ?? id;
}

/** 请求体守卫:以 INTERVIEW_TYPES 为唯一来源,新增面试类型时路由不必再改 */
export function isInterviewType(v: unknown): v is InterviewType {
  return INTERVIEW_TYPES.some((t) => t.id === v);
}

export const TOTAL_QUESTIONS = 5;

export type ChatRole = "interviewer" | "candidate";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  /** 展示文本(已剥掉 <新题>/<追问>/<结束> 标签) */
  content: string;
  /** question=新题 followup=追问 answer=候选人回答 closing=收尾语 */
  kind: "question" | "followup" | "answer" | "closing";
  ts: number;
}

export interface DimScores {
  /** 表达结构 */
  structure: number;
  /** 内容量化 */
  quantification: number;
  /** 口语化程度 */
  colloquial: number;
  /** 答题时长(按字数估算) */
  duration: number;
}

export interface Grade {
  id: string;
  /** 1-based 题号 */
  questionIndex: number;
  /** 被点评的问题文本(主问题或追问) */
  question: string;
  answer: string;
  /** 本场第几轮回答(0=主问题首答,1=第 1 次追问的回答…) */
  followupNo: number;
  /** 四维得分;null = 模型输出解析失败(降级) */
  scores: DimScores | null;
  hits: string[];
  gaps: string[];
  view: string;
  parsed: boolean;
  /** 解析失败时的模型原始输出 */
  raw?: string;
  ts: number;
}

export interface ReportRow {
  index: number;
  question: string;
  scores: DimScores;
  /** 该题追问次数 */
  followups: number;
}

export interface ReportData {
  rows: ReportRow[];
  /** 四维平均分雷达 */
  radar: DimScores;
  /** 一句话总评 */
  summary: string;
  /** 薄弱点一句话 */
  weakness: string;
  /** 守不住的点(红线) */
  redLines: string[];
  /** 明天练什么 */
  practiceTomorrow: string[];
  parsed: boolean;
}

export interface Session {
  id: string;
  jobFamily: JobFamily;
  interviewType: InterviewType;
  createdAt: number;
  updatedAt: number;
  status: "ongoing" | "finished";
  messages: ChatMessage[];
  /** 当前题号(1-based,0=尚未出题) */
  currentQuestionIndex: number;
  /** 当前题已追问次数 */
  followups: number;
  grades: Grade[];
  report?: ReportData;
  /** 选填:候选人提供的简历要点/目标 JD,面试官围绕它出题(服务端做反注入包裹) */
  contextText?: string;
  /** 面试官隐藏笔记(#NOTES# 机制,借鉴开源 Interviewer 项目):候选人不可见,进上下文与报告 */
  hiddenNotes?: string[];
}

export interface InterviewHistoryItem {
  role: ChatRole;
  content: string;
}

export interface DiagnoseItem {
  quote: string;
  reason: string;
  example: string;
  /** 引用是否逐字命中简历原文(服务端校验) */
  verified: boolean;
}

export interface DiagnoseResult {
  /** 总评分 1-100 */
  score: number;
  expand: DiagnoseItem[];
  vague: DiagnoseItem[];
  remove: DiagnoseItem[];
  /** 引用对不上原文被剔除的条数 */
  dropped: number;
  parsed: boolean;
  raw?: string;
}

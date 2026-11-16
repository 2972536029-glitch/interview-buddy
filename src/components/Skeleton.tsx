// 骨架屏(G6):加载态统一用形状近似的结构占位,替代纯文字"加载中…"
// animate-pulse 由 Tailwind 内置;底色用 surface-inset,暗色自动适配

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-surface-inset ${className ?? ""}`} />;
}

/** 文本行骨架(几行灰条) */
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** 四维评分卡骨架(面试页右侧 / 诊断中) */
export function ScoreCardSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`space-y-3 ${className ?? ""}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-4 w-5" />
        </div>
      ))}
    </div>
  );
}

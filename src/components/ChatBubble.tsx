// 对话气泡(A-4):从 interview/page.tsx 抽出,memo 化消除流式期间全量重渲
// memo 生效前提:props 浅比较 —— m 为 session.messages 中的稳定引用、isSpeaking 为 boolean、
// onToggleSpeak 由父级 useCallback([]) 保证引用稳定(内部读 speakingIdRef 判断,不闭包 state)
import { memo } from "react";
import { ChatMessage } from "@/lib/types";
import { MessageSquare, User, Volume2, Square } from "@/components/icons";

interface Props {
  m: ChatMessage;
  /** 该条消息是否正在朗读(仅对应气泡因朗读状态变化而重渲) */
  isSpeaking: boolean;
  /** 引用稳定的朗读开关:(消息 id, 消息文本) */
  onToggleSpeak: (id: string, text: string) => void;
}

function ChatBubble({ m, isSpeaking, onToggleSpeak }: Props) {
  return (
    <div
      className={`bubble-in mb-3 flex items-end gap-2 ${
        m.role === "candidate" ? "justify-end" : "justify-start"
      }`}
    >
      {/* I1 角色标识:头像形状 + 左右位置 + 颜色,三重编码(色弱友好) */}
      {m.role === "interviewer" && (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
          title="面试官"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </span>
      )}
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          m.kind === "closing"
            ? "border border-success/30 bg-success-soft text-ink"
            : m.role === "candidate"
              ? "bg-primary text-white"
              : "bg-surface-inset text-ink"
        }`}
      >
        {m.content}
        {/* I4 朗读按钮:图标化 + 朗读中状态(再点一次停止) */}
        {m.role === "interviewer" && (
          <span className="mt-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => onToggleSpeak(m.id, m.content)}
              className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                isSpeaking
                  ? "bg-primary-soft text-primary"
                  : "text-ink-tertiary hover:bg-primary/10 hover:text-primary"
              }`}
              title={isSpeaking ? "停止朗读" : "朗读本题"}
              aria-label={isSpeaking ? "停止朗读" : "朗读本题"}
            >
              {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </span>
        )}
      </div>
      {m.role === "candidate" && (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white"
          title="我"
        >
          <User className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}

export default memo(ChatBubble);

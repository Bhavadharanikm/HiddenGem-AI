"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [value]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div>
      <div
        className={cn(
          "bg-[#0f0f0f] border border-white/[0.07] rounded-2xl px-4 pt-3.5 pb-3.5 flex items-end gap-3",
          "focus-within:border-[#FAC515]/25 transition-colors duration-150",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? "Ask anything…"}
          aria-label={placeholder ?? "Chat message"}
          rows={1}
          className={cn(
            "flex-1 bg-transparent text-[14px] text-[#f0f0ef] placeholder:text-[#cccccc]",
            "outline-none resize-none leading-[1.65]",
            "min-h-[24px] max-h-[180px]",
            disabled && "cursor-not-allowed"
          )}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={
            canSend
              ? "w-8 h-8 rounded-xl bg-[#FAC515] hover:bg-[#e8b310] text-black flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#FAC515]/15 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
              : "w-8 h-8 rounded-xl bg-white/[0.04] text-[#cccccc] flex items-center justify-center flex-shrink-0 cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
          }
        >
          <ArrowUp size={15} strokeWidth={2.5} />
        </button>
      </div>
      <p className="text-[12px] text-[#cccccc] text-center mt-2 select-none">
        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[#cccccc] text-[11px]">
          ⌘
        </kbd>{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[#cccccc] text-[11px]">
          ↵
        </kbd>{" "}
        to send
      </p>
    </div>
  );
}

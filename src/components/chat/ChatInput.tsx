"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Plus, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttachedFile = {
  file: File;
  preview?: string; // object URL for images
};

const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,application/pdf";
const MAX_MB = 10;

type Props = {
  onSend: (message: string, attachments: AttachedFile[]) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [value]);

  useEffect(() => {
    return () => attachments.forEach((a) => { if (a.preview) URL.revokeObjectURL(a.preview); });
  }, [attachments]);

  function addFiles(files: FileList) {
    const next: AttachedFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_MB * 1024 * 1024) continue;
      next.push({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    setAttachments((prev) => [...prev, ...next]);
  }

  function remove(i: number) {
    setAttachments((prev) => {
      const next = [...prev];
      if (next[i].preview) URL.revokeObjectURL(next[i].preview!);
      next.splice(i, 1);
      return next;
    });
  }

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    onSend(trimmed, attachments);
    setValue("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [value, attachments, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div className="space-y-2">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachments.map((att, i) => (
            <div key={i} className="group relative">
              {att.preview ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--border)] bg-slate-50">
                  <img src={att.preview} alt={att.file.name} className="h-full w-full object-cover" />
                  <button
                    onClick={() => remove(i)}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X size={8} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div className="relative flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-slate-50 px-2.5 py-1.5">
                  <FileText size={12} className="flex-shrink-0 text-slate-500" />
                  <span className="max-w-[120px] truncate text-[11px] text-slate-700">{att.file.name}</span>
                  <button onClick={() => remove(i)} className="ml-0.5 text-slate-400 hover:text-slate-700 transition-colors">
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
      />

      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-white px-3 py-3",
          "shadow-[0_2px_12px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]",
          "focus-within:border-[rgba(41,151,255,0.4)] focus-within:shadow-[0_2px_12px_rgba(41,151,255,0.08),0_1px_3px_rgba(15,23,42,0.04)]",
          "transition-all duration-150",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
          className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none disabled:cursor-not-allowed"
        >
          <Plus size={16} strokeWidth={2} />
        </button>

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
            "flex-1 bg-transparent py-1 text-[14.5px] text-slate-900 placeholder:text-slate-400",
            "outline-none resize-none leading-[1.6]",
            "min-h-[32px] max-h-[180px]",
            disabled && "cursor-not-allowed"
          )}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.35)]",
            canSend
              ? "bg-[#1a1a1a] text-white hover:bg-[#333] active:scale-95"
              : "cursor-not-allowed bg-slate-100 text-slate-400"
          )}
        >
          <ArrowUp size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

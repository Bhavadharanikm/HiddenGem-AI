import { Gem, RotateCcw, Copy, Check, FileText } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "./ChatInterface";

type Props = {
  message: Message;
  isStreaming?: boolean;
  onRetry?: (content: string) => void;
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p: ({ children }) => <p className="mt-3 leading-[1.75] first:mt-0">{children}</p>,
  h1: ({ children }) => <h1 className="mt-4 text-base font-semibold text-slate-900 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-4 text-sm font-semibold text-slate-900 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-4 text-sm font-semibold text-slate-900 first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-4">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.75]">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  table: ({ children }) => (
    <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[rgba(47,102,229,0.06)] text-slate-600">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-[var(--border)]">{children}</tbody>,
  tr: ({ children }) => <tr className="transition-colors hover:bg-[rgba(47,102,229,0.03)]">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-600">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 text-slate-700">{children}</td>,
  pre: ({ children }) => (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-[12.5px] leading-relaxed text-slate-800 first:mt-0">
      {children}
    </pre>
  ),
  code: ({ children, className }) =>
    className ? (
      <code className="block whitespace-pre font-mono">{children}</code>
    ) : (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">{children}</code>
    ),
};

export default function MessageBubble({ message, isStreaming, onRetry }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-6 animate-fade-in">
        <div className="max-w-[88%] sm:max-w-[70%]">
          {/* Attachment previews */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap justify-end gap-2">
              {message.attachments.map((att, i) =>
                att.preview ? (
                  <img
                    key={i}
                    src={att.preview}
                    alt={att.name}
                    className="h-24 w-24 rounded-xl object-cover border border-[rgba(47,102,229,0.2)] shadow-sm"
                  />
                ) : (
                  <div key={i} className="flex items-center gap-1.5 rounded-xl border border-[rgba(47,102,229,0.2)] bg-white/70 px-2.5 py-1.5">
                    <FileText size={12} className="text-slate-500 flex-shrink-0" />
                    <span className="max-w-[120px] truncate text-[12px] text-slate-700">{att.name}</span>
                  </div>
                )
              )}
            </div>
          )}
          {message.content && (
            <div className="rounded-2xl rounded-tr-sm border border-[rgba(47,102,229,0.2)] bg-[linear-gradient(145deg,rgba(47,102,229,0.14)_0%,rgba(191,90,242,0.1)_100%)] px-4 py-3 shadow-[0_18px_36px_rgba(47,102,229,0.08)]">
              <p className="whitespace-pre-wrap text-[14px] leading-[1.75] text-slate-900">
                {message.content}
              </p>
            </div>
          )}
          <p className="mt-1.5 pr-1 text-right text-[12px] text-slate-500">
            {formatTime(message.created_at)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div aria-live={isStreaming ? "polite" : undefined} className="flex justify-start mb-6 animate-fade-in">
      <div className="flex gap-3 max-w-[92%] sm:max-w-[82%] min-w-0">
        {/* Avatar */}
        <div aria-hidden="true" className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(193,209,236,1)] bg-[rgba(255,255,255,0.84)]">
          <Gem size={12} className="text-[var(--brand)]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[rgba(255,255,255,0.78)] px-4 py-3 shadow-[0_14px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div className="text-[14px] leading-[1.75] text-slate-700">
              {isStreaming && message.content === "" ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[var(--brand)]"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[var(--brand)]"
                    style={{ animationDelay: "200ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[var(--brand)]"
                    style={{ animationDelay: "400ms" }}
                  />
                </span>
              ) : (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {message.content}
                  </ReactMarkdown>
                  {isStreaming && (
                    <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-cursor rounded-full bg-[rgba(47,102,229,0.45)] align-middle" />
                  )}
                </>
              )}
            </div>
          </div>
          <div className="mt-1.5 pl-1 flex items-center gap-3">
            <p className="text-[12px] text-slate-500">
              {isStreaming ? "Responding…" : formatTime(message.created_at)}
            </p>
            {!isStreaming && (
              <button
                onClick={copyToClipboard}
                aria-label="Copy message"
                className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-600 transition-colors"
              >
                {copied ? <Check size={11} strokeWidth={2.5} className="text-[#30d158]" /> : <Copy size={11} strokeWidth={2} />}
                <span className={copied ? "text-[#30d158]" : ""}>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
            {message.isError && message.retryContent && onRetry && (
              <button
                onClick={() => onRetry(message.retryContent!)}
                className="flex items-center gap-1 text-[12px] text-[var(--brand)] hover:text-[#1f54cf] font-medium transition-colors"
              >
                <RotateCcw size={10} strokeWidth={2.5} /> Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

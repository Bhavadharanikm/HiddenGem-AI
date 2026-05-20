import { Gem } from "lucide-react";
import type { Message } from "./ChatInterface";
import type { ReactNode } from "react";

type Props = {
  message: Message;
  isStreaming?: boolean;
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function renderMarkdown(content: string): ReactNode[] {
  return content.split("\n\n").map((block, i) => {
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    const inline = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="text-[#f0f0ef] font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={j}>{part}</span>;
    });
    return (
      <p key={i} className={i > 0 ? "mt-3 leading-[1.75]" : "leading-[1.75]"}>
        {inline}
      </p>
    );
  });
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-6 animate-fade-in">
        <div className="max-w-[70%]">
          <div className="bg-[#161616] border border-white/[0.07] rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-[14px] text-[#f0f0ef] leading-[1.75] whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          <p className="text-[12px] text-[#cccccc] mt-1.5 text-right pr-1">
            {formatTime(message.created_at)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div aria-live={isStreaming ? "polite" : undefined} className="flex justify-start mb-6 animate-fade-in">
      <div className="flex gap-3 max-w-[82%]">
        {/* Avatar */}
        <div aria-hidden="true" className="w-7 h-7 rounded-lg bg-[#FAC515]/10 border border-[#FAC515]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Gem size={12} className="text-[#FAC515]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-[#0f0f0f] border border-white/[0.05] border-l-[2px] border-l-[#FAC515]/20 rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="text-[14px] text-[#d8d8d8] leading-[1.75]">
              {isStreaming && message.content === "" ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#FAC515] animate-pulse-dot"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#FAC515] animate-pulse-dot"
                    style={{ animationDelay: "200ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#FAC515] animate-pulse-dot"
                    style={{ animationDelay: "400ms" }}
                  />
                </span>
              ) : (
                <>
                  {renderMarkdown(message.content)}
                  {isStreaming && (
                    <span className="inline-block w-[2px] h-[14px] bg-[#FAC515]/50 ml-0.5 animate-cursor align-middle rounded-full" />
                  )}
                </>
              )}
            </div>
          </div>
          <p className="text-[12px] text-[#cccccc] mt-1.5 pl-1">
            {isStreaming ? "Responding…" : formatTime(message.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

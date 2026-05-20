"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "./ChatInterface";

type Props = {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
};

function groupConversations(convos: Conversation[]) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 86400000);

  const groups: Array<{ label: string; items: Conversation[] }> = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const convo of convos) {
    const d = new Date(convo.updated_at);
    if (d >= startOfToday) groups[0].items.push(convo);
    else if (d >= startOfYesterday) groups[1].items.push(convo);
    else if (d >= startOfWeek) groups[2].items.push(convo);
    else groups[3].items.push(convo);
  }

  return groups.filter((g) => g.items.length > 0);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ConversationHistory({
  conversations,
  selectedId,
  onSelect,
  onNew,
}: Props) {
  const groups = groupConversations(conversations);

  return (
    <aside
      className="w-[260px] flex-shrink-0 h-full bg-[#0c0c0c] border-l border-white/[0.05] flex flex-col"
      style={{ fontFamily: "var(--font-body)" }}
      aria-label="Conversation history"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.05] flex items-center">
        <span className="text-[12px] font-semibold text-[#f0f0ef]">
          Conversations
        </span>
        <span className="bg-[#FAC515]/10 text-[#FAC515] text-[11px] px-1.5 py-0.5 rounded-full ml-2">
          {conversations.length}
        </span>
        <div className="flex-1" />
        <button
          onClick={onNew}
          className="flex items-center gap-1 border border-[#FAC515]/30 text-[#FAC515]/70 text-[12px] px-2.5 py-1.5 rounded-lg hover:bg-[#FAC515]/10 hover:text-[#FAC515] hover:border-[#FAC515]/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
        >
          <Plus size={11} strokeWidth={2.5} />
          New
        </button>
      </div>

      {/* Scrollable conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-[11.5px] text-[#cccccc]">
              No conversations yet
            </p>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label} className="mb-3">
              <p className="text-[11px] font-semibold text-[#FAC515] uppercase tracking-[0.12em] px-3 py-1.5">
                {label}
              </p>
              <div className="space-y-px">
                {items.map((convo) => {
                  const isActive = selectedId === convo.id;
                  return (
                    <button
                      key={convo.id}
                      onClick={() => onSelect(convo.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "flex flex-col w-full px-3 py-2.5 rounded-lg text-left transition-colors border-l-[2px]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c0c0c]",
                        isActive
                          ? "border-[#FAC515] bg-[#FAC515]/[0.05]"
                          : "border-transparent hover:bg-white/[0.03]"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[12.5px] truncate leading-snug",
                          isActive ? "text-[#f0f0ef]" : "text-[#ddd] hover:text-[#e8e8e8]"
                        )}
                      >
                        {convo.title}
                      </p>
                      <p className="text-[12px] text-[#cccccc] mt-0.5">
                        {formatTime(convo.updated_at)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

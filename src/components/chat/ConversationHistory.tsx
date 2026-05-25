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
      className="flex h-full w-full flex-shrink-0 flex-col border-l border-[var(--border)] bg-[rgba(255,255,255,0.72)] backdrop-blur-xl"
      aria-label="Conversation history"
    >
      {/* Header */}
      <div className="flex items-center border-b border-[var(--border)] px-4 pb-3 pt-4">
        <span className="text-[12px] font-semibold text-slate-900">
          Conversations
        </span>
        <span className="ml-2 rounded-full bg-[rgba(47,102,229,0.12)] px-1.5 py-0.5 text-[12px] text-[var(--brand)]">
          {conversations.length}
        </span>
        <div className="flex-1" />
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 rounded-xl bg-[#2f66e5] px-3 py-1.5 text-[12px] font-bold text-white transition-all hover:bg-[#1f54cf] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,102,229,0.45)] focus-visible:ring-offset-2 shadow-[0_8px_20px_rgba(47,102,229,0.3)]"
        >
          <Plus size={12} strokeWidth={2.5} />
          New chat
        </button>
      </div>

      {/* Scrollable conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-[12px] text-slate-500">
              No conversations yet
            </p>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label} className="mb-3">
              <p className="px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-700">
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
                        "flex w-full flex-col rounded-xl border px-3 py-2.5 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,102,229,0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                        isActive
                          ? "border-[rgba(47,102,229,0.18)] bg-[linear-gradient(145deg,rgba(47,102,229,0.12)_0%,rgba(191,90,242,0.08)_100%)] shadow-[0_12px_24px_rgba(47,102,229,0.08)]"
                          : "border-transparent hover:border-[var(--border)] hover:bg-white/60"
                      )}
                    >
                      <p
                        className={cn(
                          "truncate text-[12.5px] leading-snug",
                          isActive ? "text-black" : "text-black hover:text-black"
                        )}
                      >
                        {convo.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
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

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PanelLeft, PanelRight, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import ConversationSidebar from "./ConversationSidebar";
import ConversationHistory from "./ConversationHistory";
import MessageBubble from "./MessageBubble";
import ToolActivityIndicator from "./ToolActivityIndicator";
import ChatInput from "./ChatInput";
import SettingsModal from "@/components/settings/SettingsModal";

export type Client = {
  id: string;
  name: string;
  slug: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type Props = {
  initialClients: Client[];
  initialConversations: Conversation[];
};

export default function ChatInterface({
  initialClients,
  initialConversations,
}: Props) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    initialClients[0] ?? null
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [conversations] = useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leftNavOpen, setLeftNavOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const mqMd = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      if (mq.matches) {
        setLeftNavOpen(false);
        setHistoryOpen(false);
      } else if (mqMd.matches) {
        setHistoryOpen(false);
      }
    };
    update();
    mq.addEventListener("change", update);
    mqMd.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
      mqMd.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null);
    setMessages([]);
    setStreamingMessage(null);
    setActiveTool(null);
  }, []);

  const handleClientChange = useCallback(
    (client: Client) => {
      setSelectedClient(client);
      handleNewConversation();
    },
    [handleNewConversation]
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedClient || !content.trim() || isLoading) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingMessage("");

      const TOOL_LABELS: Record<string, string> = {
        search_knowledge_base: "Searching knowledge base...",
        query_pms_data: "Looking up bookings...",
        query_meta_ads: "Fetching Meta Ads data...",
        get_performance_metrics: "Calculating performance metrics...",
        get_audience_assets: "Loading audience assets...",
      };

      try {
        const res = await fetch("/api/v1/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Dashboard-Session": "1",
          },
          body: JSON.stringify({
            message: content,
            conversation_id: selectedConversationId,
            tenant_id: selectedClient.id,
            stream: true,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Chat failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let newConversationId = selectedConversationId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === "tool_start") {
                setActiveTool(TOOL_LABELS[evt.name] ?? `Using ${evt.name}...`);
              } else if (evt.type === "delta") {
                setActiveTool(null);
                fullContent += evt.text;
                setStreamingMessage(fullContent);
              } else if (evt.type === "done") {
                newConversationId = evt.conversation_id;
              }
            } catch {
              // Partial JSON — skip
            }
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: "assistant",
            content: fullContent,
            created_at: new Date().toISOString(),
          },
        ]);
        if (newConversationId && !selectedConversationId) {
          setSelectedConversationId(newConversationId);
        }
      } catch (err) {
        console.error("[chat]", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Something went wrong. Please try again.",
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setStreamingMessage(null);
        setActiveTool(null);
        setIsLoading(false);
      }
    },
    [selectedClient, isLoading, selectedConversationId]
  );

  const currentTitle = selectedConversationId
    ? (conversations.find((c) => c.id === selectedConversationId)?.title ??
      "Conversation")
    : "New conversation";

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#080808]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Mobile overlay backdrop — left */}
      {leftNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-black/60 w-full cursor-default border-0 md:hidden"
          onClick={() => setLeftNavOpen(false)}
        />
      )}

      {/* Column 1: Left Nav */}
      <div
        aria-hidden={!leftNavOpen}
        className={cn(
          "flex-shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden",
          "md:relative fixed inset-y-0 left-0 z-30",
          leftNavOpen ? "w-[220px]" : "w-0"
        )}
      >
        <ConversationSidebar
          clients={initialClients}
          selectedClient={selectedClient}
          onClientChange={handleClientChange}
          onSettingsOpen={() => setSettingsOpen(true)}
        />
      </div>

      {/* Column 2: Chat Center */}
      <div className="flex flex-col flex-1 min-w-0 bg-[#080808]">
        {/* Header */}
        <header className="h-11 flex items-center px-4 border-b border-white/[0.05] flex-shrink-0 gap-2">
          {/* Toggle left nav */}
          <button
            onClick={() => setLeftNavOpen((v) => !v)}
            className="p-2.5 rounded-md hover:bg-white/[0.04] text-[#888] hover:text-[#ccc] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080808]"
            aria-label="Toggle navigation"
          >
            <PanelLeft size={15} />
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 flex-1 min-w-0 text-[12px]">
            {selectedClient && (
              <>
                <span className="text-[#aaa] truncate">
                  {selectedClient.name}
                </span>
                <span className="text-[#999] select-none flex-shrink-0">/</span>
              </>
            )}
            <span className="text-[#ccc] truncate">{currentTitle}</span>
          </nav>

          {/* Toggle right history panel */}
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="p-2.5 rounded-md hover:bg-white/[0.04] text-[#888] hover:text-[#ccc] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080808]"
            aria-label="Toggle conversation history"
          >
            <PanelRight size={15} />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-[#080808]">
          {messages.length === 0 && streamingMessage === null ? (
            <EmptyState clientName={selectedClient?.name} onSuggestion={handleSend} />
          ) : (
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-1">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {streamingMessage !== null && (
                <MessageBubble
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streamingMessage,
                    created_at: new Date().toISOString(),
                  }}
                  isStreaming
                />
              )}
              {activeTool && (
                <div className="flex justify-start py-2">
                  <ToolActivityIndicator activity={activeTool} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/[0.04] pt-4 px-4 pb-6 max-w-2xl mx-auto w-full">
          <ChatInput
            onSend={handleSend}
            disabled={isLoading || !selectedClient}
            placeholder={
              selectedClient
                ? `Ask about ${selectedClient.name}…`
                : "Select a client to begin"
            }
          />
        </div>
      </div>

      {/* Mobile overlay backdrop — right */}
      {historyOpen && (
        <button
          type="button"
          aria-label="Close history"
          className="fixed inset-0 z-20 bg-black/60 w-full cursor-default border-0 lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* Column 3: Right History Panel */}
      <div
        aria-hidden={!historyOpen}
        className={cn(
          "flex-shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden",
          "lg:relative fixed inset-y-0 right-0 z-30",
          historyOpen ? "w-[260px]" : "w-0"
        )}
      >
        <ConversationHistory
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          onNew={handleNewConversation}
        />
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function EmptyState({ clientName, onSuggestion }: { clientName?: string; onSuggestion?: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-8 select-none">
      {/* Gem icon with glow */}
      <div className="relative mb-5">
        <div aria-hidden="true" className="absolute -inset-6 bg-[#FAC515]/[0.04] rounded-full blur-2xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-[#FAC515]/[0.07] border border-[#FAC515]/15 flex items-center justify-center">
          <Gem size={26} className="text-[#FAC515]" strokeWidth={1.25} />
        </div>
      </div>

      {/* Thin gold line */}
      <div aria-hidden="true" className="w-10 h-px bg-[#FAC515]/20 mb-5" />

      {/* Title */}
      <h2
        className="text-[19px] text-[#f0f0ef] font-medium mb-3"
        style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
      >
        {clientName ? `${clientName} AI` : "What can I help you with?"}
      </h2>

      {/* Subtitle */}
      <p className="text-[13px] text-[#999] max-w-[260px] leading-relaxed mb-8">
        Ask about bookings, campaign performance, audience data, or anything in
        the knowledge base.
      </p>

      {/* Suggestion chips */}
      <div className="flex flex-wrap items-center gap-2.5 justify-center">
        {["Occupancy rates", "Ad performance", "Campaign history"].map(
          (hint) => (
            <button
              type="button"
              key={hint}
              onClick={() => onSuggestion?.(hint)}
              className="text-[11.5px] text-[#bbb] border border-[#FAC515]/20 bg-[#FAC515]/[0.04] rounded-full px-3.5 py-1.5 hover:border-[#FAC515]/50 hover:text-[#f0f0ef] transition-colors cursor-pointer"
            >
              {hint}
            </button>
          )
        )}
      </div>
    </div>
  );
}

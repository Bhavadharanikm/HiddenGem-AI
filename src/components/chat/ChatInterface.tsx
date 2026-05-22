"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PanelLeft, PanelRight, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import ConversationSidebar from "./ConversationSidebar";
import ConversationHistory from "./ConversationHistory";
import MessageBubble from "./MessageBubble";
import ToolActivityIndicator from "./ToolActivityIndicator";
import ChatInput, { type AttachedFile } from "./ChatInput";
import SettingsModal from "@/components/settings/SettingsModal";
import PerformanceDashboardView from "@/components/performance/PerformanceDashboardView";
import EmailPerformanceDashboardView from "@/components/email/EmailPerformanceDashboardView";
import KnowledgeBaseView from "@/components/knowledge/KnowledgeBaseView";

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

export type MessageAttachment = {
  name: string;
  mediaType: string;
  preview?: string; // object URL — display only, not persisted
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  isError?: boolean;
  retryContent?: string;
  attachments?: MessageAttachment[];
};

type WorkspaceView = "chat" | "knowledge" | "performance" | "email";

type Props = {
  initialClients: Client[];
};

export default function ChatInterface({ initialClients }: Props) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    initialClients[0] ?? null
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leftNavOpen, setLeftNavOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const initialHistorySet = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshClients = useCallback(() => {
    fetch("/api/v1/clients", { headers: { "X-Dashboard-Session": "1" } })
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.clients)) {
          setClients(j.clients);
          // If the currently selected client was deactivated, clear the selection
          setSelectedClient((prev) => {
            if (!prev) return j.clients[0] ?? null;
            return j.clients.find((c: Client) => c.id === prev.id) ?? j.clients[0] ?? null;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch clients on mount
  useEffect(() => { refreshClients(); }, [refreshClients]);

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

  // Fetch conversations whenever the selected client changes
  useEffect(() => {
    if (!selectedClient) { setConversations([]); return; }
    fetch(`/api/v1/clients/${selectedClient.id}/conversations`, {
      headers: { "X-Dashboard-Session": "1" },
    })
      .then((r) => r.json())
      .then((j) => {
        const convs: Conversation[] = j.conversations ?? [];
        setConversations(convs);
        if (!initialHistorySet.current) {
          initialHistorySet.current = true;
          if (convs.length > 0) setHistoryOpen(true);
        }
      })
      .catch(() => setConversations([]));
  }, [selectedClient]);

  const handleNewConversation = useCallback(() => {
    setSelectedConversationId(null);
    setMessages([]);
    setStreamingMessage(null);
    setActiveTool(null);
  }, []);

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      if (!selectedClient) return;
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/v1/conversations/${conversationId}/messages?tenant_id=${selectedClient.id}`,
          { headers: { "X-Dashboard-Session": "1" } }
        );
        if (!res.ok) return;
        const json = await res.json();
        setMessages(
          (json.data ?? []).map((m: { id: string; role: "user" | "assistant"; content: string; created_at: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at,
          }))
        );
      } catch {
        // silently ignore — user can still type
      } finally {
        setIsLoading(false);
      }
    },
    [selectedClient]
  );

  useEffect(() => {
    if (!selectedConversationId) return;
    setMessages([]);
    setStreamingMessage(null);
    fetchMessages(selectedConversationId);
  }, [selectedConversationId, fetchMessages]);

  const handleClientChange = useCallback(
    (client: Client) => {
      setSelectedClient(client);
      handleNewConversation();
    },
    [handleNewConversation]
  );

  const handleSend = useCallback(
    async (content: string, attachedFiles: AttachedFile[] = []) => {
      if (!selectedClient || (!content.trim() && attachedFiles.length === 0) || isLoading) return;

      // Convert files to base64 for the API
      const apiAttachments = await Promise.all(
        attachedFiles.map(async ({ file, preview }) => {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          return { name: file.name, mediaType: file.type, data: base64, preview };
        })
      );

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        created_at: new Date().toISOString(),
        attachments: apiAttachments.map(({ name, mediaType, preview }) => ({ name, mediaType, preview })),
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
            attachments: apiAttachments.map(({ name, mediaType, data }) => ({ name, mediaType, data })),
          }),
        });

        if (!res.ok || !res.body) {
          let msg = `Request failed (${res.status})`;
          try {
            const body = await res.json();
            if (body?.error?.message) msg = body.error.message;
          } catch { /* ignore */ }
          throw new Error(msg);
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
              } else if (evt.type === "error") {
                throw new Error(evt.message ?? "Unknown error from server");
              }
            } catch (parseErr) {
              // Re-throw real errors; swallow JSON parse failures on partial lines
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
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
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ ${msg}`,
            created_at: new Date().toISOString(),
            isError: true,
            retryContent: content,
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

  const handleRetry = useCallback(
    (retryContent: string) => {
      setMessages((prev) => {
        // Remove the trailing error message and the user message before it
        const withoutError = prev.length > 0 && prev[prev.length - 1].isError
          ? prev.slice(0, -1)
          : prev;
        const m = withoutError.length;
        return m > 0 && withoutError[m - 1].role === "user"
          ? withoutError.slice(0, -1)
          : withoutError;
      });
      handleSend(retryContent);
    },
    [handleSend]
  );

  const currentTitle = selectedConversationId
    ? (conversations.find((c) => c.id === selectedConversationId)?.title ??
      "Conversation")
    : "New conversation";

  const headerTitle = activeView === "performance" ? "Performance" : activeView === "email" ? "Email Performance" : activeView === "knowledge" ? "Knowledge Base" : currentTitle;
  const showHistory = activeView === "chat";

  return (
    <div
      className="relative flex h-screen overflow-hidden bg-[#eef4fd] text-slate-900"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -right-24 top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-[rgba(41,151,255,0.12)] blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-[rgba(255,159,10,0.08)] blur-3xl" />
      </div>

      {/* Mobile overlay backdrop — left */}
      {leftNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-20 w-full cursor-default border-0 bg-slate-900/24 backdrop-blur-[2px] md:hidden"
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
          clients={clients}
          selectedClient={selectedClient}
          onClientChange={handleClientChange}
          onSettingsOpen={() => setSettingsOpen(true)}
          activeView={activeView}
          onNavigate={setActiveView}
          onFilterApply={(_month, _year) => { /* filter wired — dashboards will consume when live data is added */ }}
        />
      </div>

      {/* Column 2: Chat Center */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col bg-white/60">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[rgba(255,255,255,0.68)] px-4 backdrop-blur-xl">
          {/* Toggle left nav */}
          <button
            onClick={() => setLeftNavOpen((v) => !v)}
            className="flex-shrink-0 rounded-xl border border-transparent p-2.5 text-slate-500 transition-colors hover:border-[var(--border)] hover:bg-white/70 hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
            aria-label="Toggle navigation"
          >
          <PanelLeft size={15} />
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-[12px]">
            {selectedClient && (
              <>
                <span className="truncate text-slate-500">
                  {selectedClient.name}
                </span>
                <span className="select-none text-slate-400">/</span>
              </>
            )}
            <span className="truncate font-medium text-slate-900">{headerTitle}</span>
          </nav>

          {/* Toggle right history panel */}
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            disabled={!showHistory}
            className="flex-shrink-0 rounded-xl border border-transparent p-2.5 text-slate-500 transition-colors hover:border-[var(--border)] hover:bg-white/70 hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
            aria-label="Toggle conversation history"
          >
            <PanelRight size={15} />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-transparent">
          {activeView === "performance" ? (
            <PerformanceDashboardView clientName={selectedClient?.name ?? "Client"} />
          ) : activeView === "email" ? (
            <EmailPerformanceDashboardView clientName={selectedClient?.name ?? ""} />
          ) : activeView === "knowledge" && selectedClient ? (
            <KnowledgeBaseView clientId={selectedClient.id} clientName={selectedClient.name} />
          ) : messages.length === 0 && streamingMessage === null && !isLoading ? (
            <EmptyState clientName={selectedClient?.name} onSuggestion={handleSend} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-1 px-6 py-8">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onRetry={msg.isError ? handleRetry : undefined}
                />
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
        {activeView === "chat" ? (
          <div className="mx-auto w-full max-w-3xl border-t border-[var(--border)] px-4 pb-6 pt-4">
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
        ) : null}
      </div>

      {/* Mobile overlay backdrop — right */}
      {showHistory && historyOpen && (
        <button
          type="button"
          aria-label="Close history"
          className="fixed inset-0 z-20 w-full cursor-default border-0 bg-slate-900/24 backdrop-blur-[2px] lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* Column 3: Right History Panel */}
      <div
        aria-hidden={!historyOpen || !showHistory}
        className={cn(
          "flex-shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden",
          "lg:relative fixed inset-y-0 right-0 z-30",
          showHistory && historyOpen ? "w-[260px]" : "w-0"
        )}
      >
        <ConversationHistory
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          onNew={handleNewConversation}
        />
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onClientsChange={refreshClients} />
    </div>
  );
}

function EmptyState({ clientName, onSuggestion }: { clientName?: string; onSuggestion?: (text: string) => void }) {
  return (
    <div className="flex h-full min-h-[60vh] select-none flex-col items-center justify-center px-8 text-center">
      <div className="relative mb-6">
        <div aria-hidden="true" className="absolute -inset-8 rounded-full bg-[rgba(41,151,255,0.16)] blur-3xl" />
        <div className="relative flex h-18 w-18 items-center justify-center rounded-[1.75rem] border border-[rgba(193,209,236,1)] bg-[rgba(255,255,255,0.74)] shadow-[0_22px_50px_rgba(41,151,255,0.14)]">
          <Gem size={28} className="text-[var(--brand)]" strokeWidth={1.3} />
        </div>
      </div>

      <div aria-hidden="true" className="mb-5 h-px w-16 bg-gradient-to-r from-transparent via-[rgba(41,151,255,0.5)] to-transparent" />

      <h2
        className="mb-3 text-[22px] font-semibold tracking-[-0.03em] text-slate-900"
      >
        {clientName ? `${clientName} AI` : "What can I help you with?"}
      </h2>

      <p className="mb-8 max-w-[360px] text-[13px] leading-relaxed text-slate-500">
        Ask about bookings, campaign performance, audience data, or anything in
        the knowledge base.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {["Occupancy rates", "Ad performance", "Campaign history"].map(
          (hint) => (
            <button
              type="button"
              key={hint}
              onClick={() => {
                const q = clientName
                  ? `Tell me about ${clientName}'s ${hint.toLowerCase()}`
                  : hint;
                onSuggestion?.(q);
              }}
              className="cursor-pointer rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.76)] px-3.5 py-1.5 text-[11.5px] text-slate-600 transition-colors hover:border-[rgba(41,151,255,0.35)] hover:bg-[rgba(255,255,255,0.92)] hover:text-[var(--brand)]"
            >
              {hint}
            </button>
          )
        )}
      </div>
    </div>
  );
}

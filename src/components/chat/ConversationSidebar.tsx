"use client";

import { useState, useEffect } from "react";
import {
  Gem,
  MessageSquare,
  BookOpen,
  BarChart2,
  Target,
  Settings,
  Mail,
  HelpCircle,
  X,
  Send,
  MessageCircle,
  Bug,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ClientSwitcher from "./ClientSwitcher";
import type { Client } from "./ChatInterface";

type Props = {
  clients: Client[];
  selectedClient: Client | null;
  onClientChange: (client: Client) => void;
  onSettingsOpen: () => void;
  activeView: "chat" | "knowledge" | "performance" | "email";
  onNavigate: (view: "chat" | "knowledge" | "performance" | "email") => void;
  hasKnowledgeBase?: boolean;
  onFilterApply?: (month: number, year: number) => void;
};

const NAV_ITEMS = [
  { icon: MessageSquare, label: "Chat", view: "chat" as const },
  { icon: BookOpen, label: "Knowledge Base", view: "knowledge" as const },
  { icon: BarChart2, label: "Performance", view: "performance" as const },
  { icon: Mail, label: "Email", view: "email" as const },
  { icon: Target, label: "Campaigns", active: false },
];

export default function ConversationSidebar({
  clients,
  selectedClient,
  onClientChange,
  onSettingsOpen,
  activeView,
  onNavigate,
  hasKnowledgeBase = false,
  onFilterApply,
}: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpType, setHelpType] = useState<"ticket" | "feedback">("ticket");
  const [helpSubject, setHelpSubject] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [helpSent, setHelpSent] = useState(false);
  const [helpSending, setHelpSending] = useState(false);

  function openHelp(type: "ticket" | "feedback") {
    setHelpType(type);
    setHelpSubject("");
    setHelpMessage("");
    setHelpSent(false);
    setHelpOpen(true);
  }

  function submitHelp() {
    if (!helpMessage.trim()) return;
    setHelpSending(true);
    const subject = encodeURIComponent(
      helpType === "ticket"
        ? `[Support] ${helpSubject || "Help request"}`
        : `[Feedback] ${helpSubject || "Feedback"}`
    );
    const body = encodeURIComponent(helpMessage);
    window.location.href = `mailto:leshan@hiddengem.media?subject=${subject}&body=${body}`;
    setHelpSent(true);
    setHelpSending(false);
  }


  return (
    <aside
      className="flex h-full w-[220px] flex-shrink-0 flex-col border-r border-[var(--border)] bg-white"
      aria-label="Application navigation"
    >
      {/* Logo section */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(193,209,236,1)] bg-[rgba(41,151,255,0.1)]">
            <Gem size={18} className="text-[var(--brand)]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span
              className="text-[14px] font-semibold leading-none tracking-[-0.02em] text-slate-900"
            >
              HiddenGem AI
            </span>
          </div>
        </div>
        <div className="mx-0 mb-2 mt-3 border-t border-[var(--border)]" />
      </div>

      {/* Client Switcher section */}
      <div className="px-2 py-1">
        <p className="mb-1 px-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          Client
        </p>
        <ClientSwitcher
          clients={clients}
          selected={selectedClient}
          onSelect={onClientChange}
        />
      </div>

      {/* Divider */}
      <div className="mx-4 my-3 border-t border-[var(--border)]" />

      {/* Navigation */}
      <nav className="px-2" aria-label="Main navigation">
        <p className="mb-2 px-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          Modules
        </p>
        <div className="space-y-1">
          {NAV_ITEMS.filter((item) => item.view !== "knowledge" || hasKnowledgeBase).map((item) => {
            const isInteractive = "view" in item;
            const isActive = isInteractive && activeView === item.view;
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  if (isInteractive && item.view) onNavigate(item.view);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-150",
                  isInteractive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2",
                  isActive
                    ? "bg-[var(--brand)] text-white shadow-[0_4px_16px_rgba(41,151,255,0.3)]"
                    : isInteractive
                      ? "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                      : "cursor-default text-slate-400 pointer-events-none"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isActive ? "bg-white/20" : isInteractive ? "bg-[rgba(15,23,42,0.06)]" : "bg-[rgba(15,23,42,0.04)]"
                )}>
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2 : 1.75}
                    className={isActive ? "text-white" : "text-current"}
                  />
                </div>
                <span className="text-[12px] font-bold uppercase tracking-[0.08em]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Help + Settings at bottom */}
      <div className="px-2 mb-1 space-y-0.5">
        {/* Help */}
        <button
          onClick={() => openHelp("ticket")}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-slate-500 transition-all hover:bg-white/70 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(15,23,42,0.06)]">
            <HelpCircle size={15} strokeWidth={1.75} className="text-current" />
          </div>
          <span className="text-[12px] font-bold uppercase tracking-[0.08em]">Help</span>
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsOpen}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-slate-500 transition-all hover:bg-white/70 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(15,23,42,0.06)]">
            <Settings size={15} strokeWidth={1.75} className="text-current" />
          </div>
          <span className="text-[12px] font-bold uppercase tracking-[0.08em]">Settings</span>
        </button>
      </div>

      {/* Help modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}>
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={() => setHelpOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(15,23,42,0.18)] w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[rgba(211,223,244,0.92)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(41,151,255,0.1)]">
                  <HelpCircle size={15} className="text-[var(--brand)]" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-semibold text-slate-900">Get help</span>
              </div>
              <button onClick={() => setHelpOpen(false)} aria-label="Close help" className="text-slate-500 hover:text-slate-600 transition-colors rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {helpSent ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(48,209,88,0.12)]">
                    <Check size={22} className="text-[#30d158]" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-900">Email client opened</p>
                    <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">Your email app should open with your message pre-filled. Send it to reach Leshan directly.</p>
                  </div>
                  <button onClick={() => setHelpOpen(false)} className="mt-2 text-[12px] text-[var(--brand)] font-medium hover:underline">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Type toggle */}
                  <div className="flex gap-2">
                    {([["ticket", Bug, "Support ticket"], ["feedback", MessageCircle, "Feedback"]] as const).map(([type, Icon, label]) => (
                      <button
                        key={type}
                        onClick={() => setHelpType(type)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2",
                          helpType === type
                            ? "bg-[rgba(41,151,255,0.08)] border-[rgba(41,151,255,0.35)] text-[var(--brand)]"
                            : "bg-white border-[rgba(211,223,244,0.92)] text-slate-500 hover:border-[rgba(41,151,255,0.25)] hover:text-slate-700"
                        )}
                      >
                        <Icon size={13} strokeWidth={2} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-600 block mb-1.5">
                      {helpType === "ticket" ? "What's the issue?" : "Subject"}
                    </label>
                    <input
                      type="text"
                      value={helpSubject}
                      onChange={(e) => setHelpSubject(e.target.value)}
                      placeholder={helpType === "ticket" ? "e.g. Sync not working" : "e.g. Feature idea"}
                      className="w-full rounded-xl border border-[rgba(211,223,244,0.92)] bg-white px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-500 outline-none focus:border-[rgba(41,151,255,0.4)] focus:ring-2 focus:ring-[rgba(41,151,255,0.12)] transition-all"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-600 block mb-1.5">
                      {helpType === "ticket" ? "Describe the problem" : "Your feedback"}
                    </label>
                    <textarea
                      value={helpMessage}
                      onChange={(e) => setHelpMessage(e.target.value)}
                      placeholder={helpType === "ticket"
                        ? "What were you trying to do? What happened instead?"
                        : "What would make this tool better for you?"}
                      rows={4}
                      className="w-full rounded-xl border border-[rgba(211,223,244,0.92)] bg-white px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-500 outline-none focus:border-[rgba(41,151,255,0.4)] focus:ring-2 focus:ring-[rgba(41,151,255,0.12)] transition-all resize-none leading-relaxed"
                    />
                  </div>

                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Sends directly to <span className="font-medium text-slate-600">leshan@hiddengem.media</span> via your email client.
                  </p>

                  <button
                    onClick={submitHelp}
                    disabled={!helpMessage.trim()}
                    className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--brand)] hover:bg-[#1579d6] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.35)] focus-visible:ring-offset-2"
                  >
                    {helpSending ? <span className="animate-spin inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full" /> : <Send size={13} strokeWidth={2} />}
                    {helpType === "ticket" ? "Send support request" : "Send feedback"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="text-[12px] text-slate-500">
          Powered by HiddenGem Media
        </p>
      </div>
    </aside>
  );
}

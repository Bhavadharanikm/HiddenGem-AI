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
  activeView: "chat" | "performance" | "email";
  onNavigate: (view: "chat" | "performance" | "email") => void;
  onFilterApply?: (month: number, year: number) => void;
};

const NAV_ITEMS = [
  { icon: MessageSquare, label: "Chat", view: "chat" as const },
  { icon: BookOpen, label: "Knowledge Base", active: false },
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
  onFilterApply,
}: Props) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterApplied, setFilterApplied] = useState(false);

  useEffect(() => {
    setMonth(new Date().getMonth());
    setYear(new Date().getFullYear());
    setFilterApplied(false);
  }, [selectedClient?.id]);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

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
              HiddenGem
            </span>
            <span className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
              AI Workspace
            </span>
          </div>
        </div>
        <div className="mx-0 mb-2 mt-3 border-t border-[var(--border)]" />
      </div>

      {/* Client Switcher section */}
      <div className="px-2 py-1">
        <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
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

      {/* Month filter */}
      <div className="px-2 mb-2">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Month
        </p>
        <div className="flex gap-1.5">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex-1 rounded-xl border border-[var(--border)] bg-white px-2.5 py-2 text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[rgba(41,151,255,0.25)] appearance-none cursor-pointer"
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-[70px] rounded-xl border border-[var(--border)] bg-white px-2 py-2 text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[rgba(41,151,255,0.25)] appearance-none cursor-pointer"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button
          onClick={() => {
            onFilterApply?.(month, year);
            setFilterApplied(true);
            setTimeout(() => setFilterApplied(false), 1800);
          }}
          className="mt-2 w-full rounded-xl bg-[var(--brand)] py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#1579d6] active:bg-[#1340aa] flex items-center justify-center gap-1.5"
        >
          {filterApplied ? <><Check size={11} strokeWidth={3} /> Applied</> : "Apply Filter"}
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-3 border-t border-[var(--border)]" />

      {/* Navigation */}
      <nav className="px-2" aria-label="Main navigation">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Modules
        </p>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
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
                  isInteractive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)]",
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
                <span className="text-[11.5px] font-bold uppercase tracking-[0.08em]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings at bottom */}
      <div className="px-2 mb-3">
        <button
          onClick={onSettingsOpen}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-slate-500 transition-all hover:bg-white/70 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(15,23,42,0.06)]">
            <Settings size={15} strokeWidth={1.75} className="text-current" />
          </div>
          <span className="text-[11.5px] font-bold uppercase tracking-[0.08em]">Settings</span>
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="text-[11px] text-slate-500">
          Powered by HiddenGem Media
        </p>
      </div>
    </aside>
  );
}

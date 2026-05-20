"use client";

import {
  Gem,
  MessageSquare,
  BookOpen,
  BarChart2,
  Target,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ClientSwitcher from "./ClientSwitcher";
import type { Client } from "./ChatInterface";

type Props = {
  clients: Client[];
  selectedClient: Client | null;
  onClientChange: (client: Client) => void;
  onSettingsOpen: () => void;
};

const NAV_ITEMS = [
  { icon: MessageSquare, label: "Chat", active: true },
  { icon: BookOpen, label: "Knowledge Base", active: false },
  { icon: BarChart2, label: "Performance", active: false },
  { icon: Target, label: "Campaigns", active: false },
];

export default function ConversationSidebar({
  clients,
  selectedClient,
  onClientChange,
  onSettingsOpen,
}: Props) {
  return (
    <aside
      className="w-[220px] flex-shrink-0 h-full bg-[#0c0c0c] border-r border-white/[0.05] flex flex-col"
      style={{ fontFamily: "var(--font-body)" }}
      aria-label="Application navigation"
    >
      {/* Logo section */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2">
          <Gem size={18} className="text-[#FAC515] flex-shrink-0" strokeWidth={1.5} />
          <div className="flex items-baseline">
            <span
              className="text-[14px] font-semibold text-[#f0f0ef] italic leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              HiddenGem
            </span>
            <span className="text-[12px] text-[#FAC515] ml-1 leading-none">
              AI
            </span>
          </div>
        </div>
        <div className="border-t border-[#FAC515]/10 mx-0 mt-3 mb-2" />
      </div>

      {/* Client Switcher section */}
      <div className="px-2 py-1">
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#FAC515] px-2 mb-1">
          Client
        </p>
        <ClientSwitcher
          clients={clients}
          selected={selectedClient}
          onSelect={onClientChange}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.05] mx-4 my-3" />

      {/* Navigation */}
      <nav className="px-2" aria-label="Main navigation">
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#FAC515] px-2 mb-1">
          Workspace
        </p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-colors border-l-[2px] text-[13px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c0c0c]",
                active
                  ? "border-[#FAC515] bg-[#FAC515]/[0.07] text-[#f0f0ef]"
                  : "border-transparent hover:bg-white/[0.03] text-[#cccccc] hover:text-[#e0e0e0]"
              )}
            >
              <Icon
                size={14}
                className={cn(
                  "flex-shrink-0",
                  active ? "text-[#FAC515]" : "text-current"
                )}
                strokeWidth={active ? 2 : 1.75}
              />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings at bottom */}
      <div className="px-2 mb-3">
        <button
          onClick={onSettingsOpen}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-colors border-l-[2px] border-transparent hover:bg-white/[0.03] text-[#cccccc] hover:text-[#e0e0e0] text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c0c0c]"
        >
          <Settings size={14} className="flex-shrink-0 text-current" strokeWidth={1.75} />
          Settings
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.05]">
        <p className="text-[11px] text-[#cccccc]">
          Powered by HiddenGem Media
        </p>
      </div>
    </aside>
  );
}

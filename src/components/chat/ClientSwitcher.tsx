"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Client } from "./ChatInterface";

type Props = {
  clients: Client[];
  selected: Client | null;
  onSelect: (client: Client) => void;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const SWATCH_COLORS = [
  "bg-[#FAC515]/15 text-[#FAC515] border-[#FAC515]/25",
  "bg-amber-600/15 text-amber-500 border-amber-600/25",
  "bg-yellow-700/15 text-yellow-500 border-yellow-700/25",
  "bg-orange-700/15 text-orange-500 border-orange-700/25",
];

export default function ClientSwitcher({ clients, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleOut);
    return () => document.removeEventListener("mousedown", handleOut);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 60);
  }, [open]);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  function swatchClass(idx: number) {
    return SWATCH_COLORS[idx % SWATCH_COLORS.length];
  }

  const selectedIdx = selected
    ? clients.findIndex((c) => c.id === selected.id)
    : 0;

  return (
    <div className="relative" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select client"
        className={cn(
          "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg",
          "hover:bg-white/[0.05] transition-colors text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c0c0c]",
          open && "bg-white/[0.05]"
        )}
      >
        {selected ? (
          <>
            <div
              className={cn(
                "w-7 h-7 rounded-md border flex items-center justify-center flex-shrink-0 text-[10px] font-semibold",
                swatchClass(selectedIdx)
              )}
            >
              {getInitials(selected.name)}
            </div>
            <span className="text-[13px] text-[#f0f0ef] font-medium truncate flex-1 min-w-0">
              {selected.name}
            </span>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-md bg-[#0c0c0c] border border-white/[0.07] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] text-[#d0d0d0]">—</span>
            </div>
            <span className="text-[13px] text-[#d0d0d0] flex-1">
              Select client
            </span>
          </>
        )}
        <ChevronDown
          size={12}
          className={cn(
            "text-[#d0d0d0] transition-transform duration-150 flex-shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div role="listbox" aria-label="Clients" className="absolute top-full left-0 right-0 mt-1 bg-[#111111] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/90 z-50 overflow-hidden animate-slide-up">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
            <Search size={12} className="text-[#cccccc] flex-shrink-0" aria-hidden={true} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              aria-label="Search clients"
              className="flex-1 bg-transparent text-[12.5px] text-[#f0f0ef] placeholder:text-[#cccccc] outline-none"
            />
          </div>

          {/* List */}
          <div className="py-1 max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-[#d0d0d0] px-3 py-3 text-center">
                No clients found
              </p>
            ) : (
              filtered.map((client) => {
                const idx = clients.findIndex((c) => c.id === client.id);
                const isActive = selected?.id === client.id;
                return (
                  <button
                    key={client.id}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onSelect(client);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50",
                      isActive
                        ? "bg-[#FAC515]/[0.06]"
                        : "hover:bg-white/[0.04]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 text-[11px] font-semibold",
                        swatchClass(idx)
                      )}
                    >
                      {getInitials(client.name)}
                    </div>
                    <span
                      className={cn(
                        "text-[12.5px] flex-1 truncate",
                        isActive ? "text-[#f0f0ef]" : "text-[#cccccc]"
                      )}
                    >
                      {client.name}
                    </span>
                    {isActive && (
                      <Check
                        size={11}
                        className="text-[#FAC515] flex-shrink-0"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

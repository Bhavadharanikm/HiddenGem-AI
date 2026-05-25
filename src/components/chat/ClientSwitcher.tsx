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
  "bg-[rgba(47,102,229,0.12)] text-[#2f66e5] border-[rgba(47,102,229,0.2)]",
  "bg-[rgba(255,159,10,0.12)] text-[#ff9f0a] border-[rgba(255,159,10,0.2)]",
  "bg-[rgba(48,209,88,0.12)] text-[#30d158] border-[rgba(48,209,88,0.2)]",
  "bg-[rgba(191,90,242,0.12)] text-[#bf5af2] border-[rgba(191,90,242,0.2)]",
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
          "flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors",
          "hover:border-[var(--border)] hover:bg-white/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,102,229,0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          open && "border-[var(--border)] bg-white/70"
        )}
      >
        {selected ? (
          <>
            <div
              className={cn(
                "w-7 h-7 rounded-md border flex items-center justify-center flex-shrink-0 text-[12px] font-semibold",
                swatchClass(selectedIdx)
              )}
            >
              {getInitials(selected.name)}
            </div>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900">
              {selected.name}
            </span>
          </>
        ) : (
          <>
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-white/70">
              <span className="text-[12px] text-slate-500">—</span>
            </div>
            <span className="flex-1 text-[13px] text-slate-500">
              Select client
            </span>
          </>
        )}
        <ChevronDown
          size={12}
          className={cn(
            "flex-shrink-0 text-slate-400 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div role="listbox" aria-label="Clients" className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.94)] shadow-[0_22px_50px_rgba(15,23,42,0.14)] animate-slide-up backdrop-blur-xl">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
            <Search size={12} className="flex-shrink-0 text-slate-500" aria-hidden={true} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              aria-label="Search clients"
              className="flex-1 bg-transparent text-[12.5px] text-slate-900 placeholder:text-slate-500 outline-none"
            />
          </div>

          {/* List */}
          <div className="py-1 max-h-[min(13rem,calc(100vh-200px))] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-[12px] text-slate-500">
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
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,102,229,0.3)] focus-visible:ring-offset-2",
                      isActive
                        ? "bg-[rgba(47,102,229,0.08)]"
                        : "hover:bg-[rgba(47,102,229,0.04)]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 text-[12px] font-semibold",
                        swatchClass(idx)
                      )}
                    >
                      {getInitials(client.name)}
                    </div>
                    <span
                      className={cn(
                        "text-[12.5px] flex-1 truncate",
                        isActive ? "text-slate-900" : "text-slate-600"
                      )}
                    >
                      {client.name}
                    </span>
                    {isActive && (
                      <Check
                        size={11}
                        className="flex-shrink-0 text-[var(--brand)]"
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

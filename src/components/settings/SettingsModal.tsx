"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Gem, Plus, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import ClientSettingsPanel, { type ClientRecord } from "./ClientSettingsPanel";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SWATCH_COLORS = [
  "bg-[#FAC515]/15 text-[#FAC515] border-[#FAC515]/25",
  "bg-amber-600/15 text-amber-500 border-amber-600/25",
  "bg-yellow-700/15 text-yellow-500 border-yellow-700/25",
  "bg-orange-700/15 text-orange-500 border-orange-700/25",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ─────────────────────────────────────────────────────────────
// Add Client Form (inline in right pane)
// ─────────────────────────────────────────────────────────────

type AddClientFormProps = {
  onSaved: (client: ClientRecord) => void;
  onCancel: () => void;
};

function AddClientForm({ onSaved, onCancel }: AddClientFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(toSlug(value));
  }

  async function handleSave() {
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), system_prompt: systemPrompt.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSaved(json.client);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-[16px] font-semibold text-[#f0f0ef]">Add client</h2>
        <p className="text-[12px] text-[#888] mt-0.5">Create a new client workspace.</p>
      </div>

      <div>
        <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">Client name</label>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Paradise Point"
          className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors"
        />
      </div>

      <div>
        <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">Slug</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. paradise-point"
          className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] font-mono outline-none focus:border-[#FAC515]/40 transition-colors"
        />
        <p className="text-[11px] text-[#555] mt-1">Lowercase, hyphens only</p>
      </div>

      <div>
        <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">AI system prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are the AI assistant for [Client Name]. You help the HiddenGem Media team analyse bookings, campaigns, and guest data..."
          rows={4}
          className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors resize-none leading-relaxed"
        />
      </div>

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] disabled:opacity-50 text-black font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
          {saving ? "Saving…" : "Save client"}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-[12px] text-[#888] hover:text-[#ccc] px-3 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <X size={12} />
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main: SettingsModal
// ─────────────────────────────────────────────────────────────

export default function SettingsModal({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // ESC key close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/clients", {
        headers: { "X-Dashboard-Session": "1" },
      });
      const json = await res.json();
      if (res.ok) {
        setClients(json.clients ?? []);
        if (!selectedClientId && json.clients?.length > 0) {
          setSelectedClientId(json.clients[0].id);
        }
      }
    } catch {
      // Silently fail — clients remain empty
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    if (open) fetchClients();
  }, [open, fetchClients]);

  function handleClientAdded(client: ClientRecord) {
    setClients((prev) => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedClientId(client.id);
    setShowAddForm(false);
  }

  function handleClientUpdated(updated: ClientRecord) {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const selectedIndex = clients.findIndex((c) => c.id === selectedClientId);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-sm border-0 cursor-default"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-4xl h-full max-h-[700px] flex rounded-2xl overflow-hidden bg-[#0c0c0c] border border-white/[0.08] shadow-2xl shadow-black/80 animate-fade-in"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* Left sidebar */}
        <div className="w-[220px] flex-shrink-0 bg-[#0a0a0a] border-r border-white/[0.05] flex flex-col">
          {/* Header */}
          <div className="px-4 pt-5 pb-4 border-b border-white/[0.05] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Gem size={14} className="text-[#FAC515]" strokeWidth={1.5} />
              <span
                className="text-[13px] font-semibold text-[#f0f0ef]"
                style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
              >
                Settings
              </span>
            </div>
          </div>

          {/* Add client button */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <button
              onClick={() => { setShowAddForm(true); setSelectedClientId(null); }}
              className={cn(
                "flex items-center gap-1.5 w-full text-[12px] font-medium px-3 py-2 rounded-lg transition-colors border",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50",
                showAddForm
                  ? "bg-[#FAC515]/10 text-[#FAC515] border-[#FAC515]/30"
                  : "text-[#FAC515] border-[#FAC515]/30 hover:bg-[#FAC515]/[0.06]"
              )}
            >
              <Plus size={12} strokeWidth={2.5} />
              Add client
            </button>
          </div>

          {/* Client list */}
          <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Clients">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={14} className="text-[#FAC515] animate-spin" />
              </div>
            ) : (
              clients.map((client, idx) => {
                const isSelected = selectedClientId === client.id && !showAddForm;
                const swatch = SWATCH_COLORS[idx % SWATCH_COLORS.length];
                return (
                  <button
                    key={client.id}
                    onClick={() => { setSelectedClientId(client.id); setShowAddForm(false); }}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-colors border-l-[2px] mb-0.5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a]",
                      isSelected
                        ? "border-[#FAC515] bg-[#FAC515]/[0.07]"
                        : "border-transparent hover:bg-white/[0.03]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 text-[10px] font-semibold",
                        swatch
                      )}
                    >
                      {getInitials(client.name)}
                    </div>
                    <span
                      className={cn(
                        "text-[12px] truncate",
                        isSelected ? "text-[#f0f0ef]" : "text-[#aaa]"
                      )}
                    >
                      {client.name}
                    </span>
                  </button>
                );
              })
            )}
          </nav>

          {/* Footer: close button */}
          <div className="px-3 py-3 border-t border-white/[0.05] flex-shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 w-full text-[12px] text-[#555] hover:text-[#aaa] px-2.5 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
            >
              <X size={12} />
              Close
            </button>
          </div>
        </div>

        {/* Right pane */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {showAddForm ? (
            <div className="flex-1 overflow-y-auto">
              <AddClientForm
                onSaved={handleClientAdded}
                onCancel={() => {
                  setShowAddForm(false);
                  if (!selectedClientId && clients.length > 0) {
                    setSelectedClientId(clients[0].id);
                  }
                }}
              />
            </div>
          ) : selectedClient ? (
            <div className="flex-1 overflow-y-auto p-6">
              <ClientSettingsPanel
                key={selectedClient.id}
                client={selectedClient}
                clientIndex={selectedIndex}
                onUpdate={handleClientUpdated}
              />
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={20} className="text-[#FAC515] animate-spin" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[13px] text-[#555]">Select a client or add a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

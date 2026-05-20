"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Gem,
  Plus,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Trash2,
} from "lucide-react";
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
// Wizard types & constants
// ─────────────────────────────────────────────────────────────

type WizardStep = 0 | 1 | 2 | 3 | 4;

const WIZARD_STEPS = [
  { label: "Basics",    subtitle: "Enter the basics to get started." },
  { label: "Knowledge", subtitle: "Add Google Drive documents the AI can reference." },
  { label: "PMS Data",  subtitle: "Connect a property management system." },
  { label: "Meta Ads",  subtitle: "Connect your Meta advertising account." },
  { label: "Done",      subtitle: "Your client is set up and ready to use." },
] as const;

const PMS_PROVIDERS = [
  { value: "guesty",   label: "Guesty" },
  { value: "hostaway", label: "Hostaway" },
  { value: "lodgify",  label: "Lodgify" },
] as const;

type PmsProvider = "guesty" | "hostaway" | "lodgify";

function getCredentialFields(provider: PmsProvider): { key: string; label: string }[] {
  if (provider === "hostaway") {
    return [
      { key: "account_id", label: "Account ID" },
      { key: "api_secret", label: "API Secret" },
    ];
  }
  return [{ key: "api_key", label: "API Key" }];
}

type WizardDoc = {
  id: string;
  name: string;
  google_doc_url: string;
  status: string;
};

// ─────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────

function WizardProgressBar({ step }: { step: WizardStep }) {
  return (
    <div className="flex items-center gap-0 mb-5">
      {WIZARD_STEPS.map((s, i) => (
        <div key={s.label} className="flex items-center flex-1 last:flex-none">
          {i > 0 && (
            <div
              className={cn(
                "flex-1 h-px transition-colors duration-300",
                i <= step ? "bg-[#FAC515]/30" : "bg-white/[0.06]"
              )}
            />
          )}
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all duration-300",
              i < step
                ? "bg-[#FAC515] text-black"
                : i === step
                ? "bg-[#FAC515]/15 text-[#FAC515] ring-1 ring-[#FAC515]/40"
                : "bg-white/[0.05] text-[#444]"
            )}
          >
            {i < step ? <Check size={10} strokeWidth={3} /> : i + 1}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Add Client Wizard
// ─────────────────────────────────────────────────────────────

type AddClientWizardProps = {
  onSaved: (client: ClientRecord) => void;
  onCancel: () => void;
};

function AddClientWizard({ onSaved, onCancel }: AddClientWizardProps) {
  const [step, setStep] = useState<WizardStep>(0);
  const [createdClient, setCreatedClient] = useState<ClientRecord | null>(null);

  // Step 0 — Basics
  const [name, setName]           = useState("");
  const [slug, setSlug]           = useState("");
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Step 1 — Knowledge
  const [docs, setDocs]       = useState<WizardDoc[]>([]);
  const [driveUrl, setDriveUrl] = useState("");
  const [docName, setDocName] = useState("");
  const [adding, setAdding]   = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Step 2 — PMS
  const [provider, setProvider]       = useState<PmsProvider>("guesty");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [pmsConnected, setPmsConnected] = useState(false);
  const [savingPms, setSavingPms]     = useState(false);
  const [pmsError, setPmsError]       = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(toSlug(value));
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) {
      setCreateError("Name and slug are required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCreatedClient(json.client);
      setStep(1);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create client");
    } finally {
      setCreating(false);
    }
  }

  async function handleAddDoc() {
    if (!driveUrl.trim() || !createdClient) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/v1/clients/${createdClient.id}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({
          drive_url: driveUrl.trim(),
          name: docName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDocs((prev) => [...prev, json.doc]);
      setDriveUrl("");
      setDocName("");
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add document");
    } finally {
      setAdding(false);
    }
  }

  function handleRemoveDoc(id: string) {
    if (!createdClient) return;
    fetch(`/api/v1/clients/${createdClient.id}/knowledge/${id}`, {
      method: "DELETE",
      headers: { "X-Dashboard-Session": "1" },
    }).catch(() => {});
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleSavePms() {
    if (!createdClient) return;
    const fields = getCredentialFields(provider);
    for (const f of fields) {
      if (!credentials[f.key]?.trim()) {
        setPmsError(`${f.label} is required`);
        return;
      }
    }
    setSavingPms(true);
    setPmsError(null);
    try {
      const res = await fetch(`/api/v1/clients/${createdClient.id}/pms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ provider, credentials }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPmsConnected(true);
      setTimeout(() => setStep(3), 700);
    } catch (e) {
      setPmsError(e instanceof Error ? e.message : "Failed to save connection");
    } finally {
      setSavingPms(false);
    }
  }

  function advance() {
    setStep((s) => Math.min(s + 1, 4) as WizardStep);
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0) as WizardStep);
  }

  const { label: stepLabel, subtitle: stepSubtitle } = WIZARD_STEPS[step];

  return (
    <div className="flex flex-col h-full p-5 sm:p-6">
      <WizardProgressBar step={step} />

      {/* Step header */}
      <div className="flex items-start justify-between mb-5 flex-shrink-0">
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider">
            Step {step + 1} of {WIZARD_STEPS.length}
          </p>
          <h2 className="text-[15px] font-semibold text-[#f0f0ef] mt-0.5">{stepLabel}</h2>
          <p className="text-[12px] text-[#666] mt-0.5">{stepSubtitle}</p>
        </div>
        {step > 0 && step < 4 && (
          <button
            onClick={back}
            className="flex items-center gap-0.5 text-[11px] text-[#555] hover:text-[#888] transition-colors flex-shrink-0 ml-4 mt-1"
          >
            <ChevronLeft size={12} />
            Back
          </button>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Step 0: Basics ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">
                Client name
              </label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Paradise Point"
                className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors"
              />
            </div>
            {createError && (
              <p className="text-[12px] text-red-400">{createError}</p>
            )}
          </div>
        )}

        {/* ── Step 1: Knowledge Base ── */}
        {step === 1 && (
          <div className="space-y-4">
            {docs.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#111] border border-white/[0.05]"
                  >
                    <FileText size={13} className="text-[#888] flex-shrink-0" />
                    <span className="text-[12px] text-[#d8d8d8] truncate flex-1">
                      {doc.name}
                    </span>
                    <button
                      onClick={() => handleRemoveDoc(doc.id)}
                      className="p-1 text-[#555] hover:text-[#ef4444] transition-colors flex-shrink-0"
                      aria-label={`Remove ${doc.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">
                Google Drive URL
              </label>
              <input
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDoc()}
                placeholder="https://docs.google.com/..."
                className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">
                Document name{" "}
                <span className="normal-case text-[#555]">(optional)</span>
              </label>
              <input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDoc()}
                placeholder="e.g. Brand Guidelines"
                className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors"
              />
            </div>
            {addError && (
              <p className="text-[12px] text-red-400">{addError}</p>
            )}
            <button
              onClick={handleAddDoc}
              disabled={adding || !driveUrl.trim()}
              className="flex items-center gap-1.5 text-[12px] border border-white/[0.08] hover:border-white/[0.15] disabled:opacity-40 disabled:cursor-not-allowed text-[#ccc] px-3 py-1.5 rounded-lg transition-colors"
            >
              {adding
                ? <Loader2 size={11} className="animate-spin" />
                : <Plus size={11} strokeWidth={2.5} />}
              {adding ? "Adding…" : "Add document"}
            </button>
          </div>
        )}

        {/* ── Step 2: PMS Data ── */}
        {step === 2 && (
          <div className="space-y-4">
            {pmsConnected ? (
              <div className="flex items-center gap-2.5 py-2">
                <div className="w-5 h-5 rounded-full bg-[#22c55e]/15 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-[#22c55e]" strokeWidth={2.5} />
                </div>
                <span className="text-[13px] text-[#22c55e]">PMS connected!</span>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">
                    Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value as PmsProvider);
                      setCredentials({});
                    }}
                    className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] outline-none focus:border-[#FAC515]/40 transition-colors appearance-none"
                  >
                    {PMS_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                {getCredentialFields(provider).map((field) => (
                  <div key={field.key}>
                    <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">
                      {field.label}
                    </label>
                    <input
                      type="password"
                      value={credentials[field.key] ?? ""}
                      onChange={(e) =>
                        setCredentials((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder={`Enter ${field.label}`}
                      className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors"
                    />
                  </div>
                ))}
                {pmsError && (
                  <p className="text-[12px] text-red-400">{pmsError}</p>
                )}
                <button
                  onClick={handleSavePms}
                  disabled={savingPms}
                  className="flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] disabled:opacity-50 text-black font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {savingPms
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Check size={11} strokeWidth={2.5} />}
                  {savingPms ? "Connecting…" : "Connect PMS"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Meta Ads ── */}
        {step === 3 && createdClient && (
          <div className="space-y-4">
            <div className="bg-[#111] border border-white/[0.05] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#555]" />
                <span className="text-[12px] text-[#888]">Not connected</span>
              </div>
              <a
                href={`/api/v1/meta-ads/connect?tenant_id=${createdClient.id}`}
                className="inline-flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] text-black font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Connect Meta Account
              </a>
              <p className="text-[11px] text-[#555]">
                Connecting will redirect you to Meta to authorise access.
                You can also connect later from the Meta Ads tab.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 4 && createdClient && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#22c55e]/15 flex items-center justify-center flex-shrink-0">
                <Check size={15} className="text-[#22c55e]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#f0f0ef]">
                  {createdClient.name}
                </p>
                <p className="text-[11px] text-[#555] font-mono">
                  {createdClient.slug}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  label: "Client created",
                  done: true,
                  detail: undefined,
                },
                {
                  label: "Knowledge documents",
                  done: docs.length > 0,
                  detail:
                    docs.length > 0
                      ? `${docs.length} doc${docs.length > 1 ? "s" : ""} added`
                      : "skipped",
                },
                {
                  label: "PMS connected",
                  done: pmsConnected,
                  detail: pmsConnected ? undefined : "skipped",
                },
                {
                  label: "Meta Ads",
                  done: false,
                  detail: "connect from settings",
                },
              ].map(({ label, done, detail }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                      done ? "bg-[#22c55e]/15" : "bg-white/[0.05]"
                    )}
                  >
                    {done ? (
                      <Check size={9} className="text-[#22c55e]" strokeWidth={3} />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#555]" />
                    )}
                  </div>
                  <span className="text-[12px] text-[#d8d8d8]">{label}</span>
                  {detail && (
                    <span className="text-[11px] text-[#555]">— {detail}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.05] flex-shrink-0">
        {step === 0 && (
          <>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 text-[12px] text-[#555] hover:text-[#888] transition-colors"
            >
              <X size={11} />
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
            >
              {creating && <Loader2 size={11} className="animate-spin" />}
              {creating ? "Creating…" : "Create client"}
              {!creating && <ChevronRight size={12} />}
            </button>
          </>
        )}

        {(step === 1 || step === 2 || step === 3) && (
          <>
            <button
              onClick={advance}
              className="text-[12px] text-[#555] hover:text-[#888] transition-colors"
            >
              Skip
            </button>
            <button
              onClick={advance}
              className="flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] text-black font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
            >
              {step === 3 ? "Finish setup" : "Next"}
              <ChevronRight size={12} />
            </button>
          </>
        )}

        {step === 4 && createdClient && (
          <>
            <div />
            <button
              onClick={() => onSaved(createdClient)}
              className="flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] text-black font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
            >
              Open settings
              <ChevronRight size={12} />
            </button>
          </>
        )}
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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
    setClients((prev) =>
      [...prev, client].sort((a, b) => a.name.localeCompare(b.name))
    );
    setSelectedClientId(client.id);
    setShowAddForm(false);
  }

  function handleClientUpdated(updated: ClientRecord) {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const selectedIndex  = clients.findIndex((c) => c.id === selectedClientId);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8"
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
        className="relative z-10 w-full max-w-4xl h-full max-h-[92vh] sm:max-h-[700px] flex rounded-2xl overflow-hidden bg-[#0c0c0c] border border-white/[0.08] shadow-2xl shadow-black/80 animate-fade-in"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* Left sidebar — hidden on mobile when wizard is open */}
        <div
          className={cn(
            "flex-shrink-0 bg-[#0a0a0a] border-r border-white/[0.05] flex-col w-[200px] sm:w-[220px]",
            showAddForm ? "hidden sm:flex" : "flex"
          )}
        >
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
            <AddClientWizard
              onSaved={handleClientAdded}
              onCancel={() => {
                setShowAddForm(false);
                if (!selectedClientId && clients.length > 0) {
                  setSelectedClientId(clients[0].id);
                }
              }}
            />
          ) : selectedClient ? (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
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
              <p className="text-[13px] text-[#555]">
                Select a client or add a new one
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

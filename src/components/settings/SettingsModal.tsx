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
  onClientsChange?: () => void;
};

const SWATCH_COLORS = [
  "bg-[rgba(41,151,255,0.12)] text-[#2997ff] border-[rgba(41,151,255,0.2)]",
  "bg-[rgba(255,159,10,0.12)] text-[#ff9f0a] border-[rgba(255,159,10,0.2)]",
  "bg-[rgba(48,209,88,0.12)] text-[#30d158] border-[rgba(48,209,88,0.2)]",
  "bg-[rgba(191,90,242,0.12)] text-[#bf5af2] border-[rgba(191,90,242,0.2)]",
];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
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
  { value: "guesty",     label: "Guesty" },
  { value: "hostaway",   label: "Hostaway" },
  { value: "lodgify",    label: "Lodgify" },
  { value: "ownerrez",   label: "OwnerRez" },
  { value: "hostfully",  label: "Hostfully" },
  { value: "igms",       label: "iGMS" },
  { value: "smoobu",     label: "Smoobu" },
  { value: "beds24",     label: "Beds24" },
  { value: "streamline", label: "Streamline" },
  { value: "liverez",    label: "LiveRez" },
  { value: "track",      label: "Track (ResortPro)" },
  { value: "custom",     label: "Custom / Other" },
] as const;

type PmsProvider = "guesty" | "hostaway" | "lodgify" | "ownerrez" | "hostfully" | "igms" | "smoobu" | "beds24" | "streamline" | "liverez" | "track" | "custom";

function getCredentialFields(provider: PmsProvider): { key: string; label: string; type?: string }[] {
  switch (provider) {
    case "guesty":
      return [
        { key: "client_id",     label: "Client ID" },
        { key: "client_secret", label: "Client Secret", type: "password" },
      ];
    case "hostaway":
      return [
        { key: "account_id",    label: "Account ID" },
        { key: "client_secret", label: "Client Secret", type: "password" },
      ];
    case "ownerrez":
      return [
        { key: "client_id",     label: "Client ID" },
        { key: "client_secret", label: "Client Secret", type: "password" },
      ];
    case "hostfully":
      return [
        { key: "api_key",    label: "API Key",    type: "password" },
        { key: "agency_uid", label: "Agency UID" },
      ];
    case "beds24":
      return [
        { key: "entry_id", label: "Entry ID" },
        { key: "api_key",  label: "API Key", type: "password" },
      ];
    case "streamline":
    case "liverez":
    case "track":
      return [
        { key: "base_url",  label: "Base URL" },
        { key: "username",  label: "Username" },
        { key: "password",  label: "Password", type: "password" },
      ];
    case "custom":
      return [
        { key: "base_url", label: "Base URL" },
        { key: "api_key",  label: "API Key", type: "password" },
      ];
    default:
      return [{ key: "api_key", label: "API Key", type: "password" }];
  }
}

type WizardDoc = { id: string; name: string; google_doc_url: string; status: string };

// ─────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────

function WizardProgressBar({ step }: { step: WizardStep }) {
  return (
    <div className="flex items-center mb-6">
      {WIZARD_STEPS.map((s, i) => (
        <div key={s.label} className="flex items-center flex-1 last:flex-none">
          {i > 0 && (
            <div className={cn("flex-1 h-px transition-colors duration-300", i <= step ? "bg-[var(--brand)]" : "bg-[var(--border)]")} />
          )}
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-all duration-300 border",
            i < step  ? "bg-[var(--brand)] border-[var(--brand)] text-white"
            : i === step ? "bg-[rgba(41,151,255,0.1)] border-[var(--brand)] text-[var(--brand)]"
            : "bg-white border-[var(--border)] text-slate-500"
          )}>
            {i < step ? <Check size={10} strokeWidth={3} /> : i + 1}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Input / field helpers
// ─────────────────────────────────────────────────────────────

const fieldClass = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-500 outline-none focus:border-[rgba(41,151,255,0.4)] focus:ring-2 focus:ring-[rgba(41,151,255,0.12)] transition-all";
const labelClass = "text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-600 block mb-1.5";
const primaryBtn = "flex items-center gap-1.5 text-[12px] bg-[var(--brand)] hover:bg-[#1579d6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.35)] focus-visible:ring-offset-2";
const ghostBtn  = "text-[12px] text-slate-500 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2 rounded-lg px-2 py-1";

// ─────────────────────────────────────────────────────────────
// Add Client Wizard
// ─────────────────────────────────────────────────────────────

type AddClientWizardProps = { onSaved: (client: ClientRecord) => void; onCancel: () => void };

function AddClientWizard({ onSaved, onCancel }: AddClientWizardProps) {
  const [step, setStep] = useState<WizardStep>(0);
  const [createdClient, setCreatedClient] = useState<ClientRecord | null>(null);

  const [name, setName]         = useState("");
  const [slug, setSlug]         = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [docs, setDocs]         = useState<WizardDoc[]>([]);
  const [driveUrl, setDriveUrl] = useState("");
  const [docName, setDocName]   = useState("");
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [provider, setProvider]       = useState<PmsProvider>("guesty");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [pmsConnected, setPmsConnected] = useState(false);
  const [savingPms, setSavingPms]     = useState(false);
  const [pmsError, setPmsError]       = useState<string | null>(null);

  function handleNameChange(v: string) { setName(v); setSlug(toSlug(v)); }

  async function handleCreate() {
    if (!name.trim()) { setCreateError("Client name is required"); return; }
    setCreating(true); setCreateError(null);
    try {
      const res = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCreatedClient(json.client);
      setStep(1);
    } catch (e) { setCreateError(e instanceof Error ? e.message : "Failed to create client"); }
    finally { setCreating(false); }
  }

  async function handleAddDoc() {
    if (!driveUrl.trim() || !createdClient) return;
    setAdding(true); setAddError(null);
    try {
      const res = await fetch(`/api/v1/clients/${createdClient.id}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ drive_url: driveUrl.trim(), name: docName.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDocs((prev) => [...prev, json.doc]);
      setDriveUrl(""); setDocName("");
    } catch (e) { setAddError(e instanceof Error ? e.message : "Failed to add document"); }
    finally { setAdding(false); }
  }

  function handleRemoveDoc(id: string) {
    if (!createdClient) return;
    fetch(`/api/v1/clients/${createdClient.id}/knowledge/${id}`, { method: "DELETE", headers: { "X-Dashboard-Session": "1" } }).catch(() => {});
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleSavePms() {
    if (!createdClient) return;
    const fields = getCredentialFields(provider);
    for (const f of fields) {
      if (!credentials[f.key]?.trim()) { setPmsError(`${f.label} is required`); return; }
    }
    setSavingPms(true); setPmsError(null);
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
    } catch (e) { setPmsError(e instanceof Error ? e.message : "Failed to save connection"); }
    finally { setSavingPms(false); }
  }

  function advance() { setStep((s) => Math.min(s + 1, 4) as WizardStep); }
  function back()    { setStep((s) => Math.max(s - 1, 0) as WizardStep); }

  const { label: stepLabel, subtitle: stepSubtitle } = WIZARD_STEPS[step];

  return (
    <div className="flex flex-col h-full p-5 sm:p-6">
      <WizardProgressBar step={step} />

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-shrink-0">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Step {step + 1} of {WIZARD_STEPS.length}</p>
          <h2 className="text-[16px] font-semibold text-slate-900 mt-0.5">{stepLabel}</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">{stepSubtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4">

        {/* Step 0: Basics */}
        {step === 0 && (
          <>
            <div>
              <label className={labelClass}>Client name</label>
              <input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Paradise Point" className={fieldClass} />
            </div>
            {createError && <p className="text-[12px] text-red-500">{createError}</p>}
          </>
        )}

        {/* Step 1: Knowledge */}
        {step === 1 && (
          <>
            {docs.length > 0 && (
              <div className="space-y-1.5">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[rgba(41,151,255,0.05)] border border-[var(--border)]">
                    <FileText size={13} className="text-[var(--brand)] flex-shrink-0" />
                    <span className="text-[12px] text-slate-700 truncate flex-1">{doc.name}</span>
                    <button onClick={() => handleRemoveDoc(doc.id)} aria-label="Remove document" className="p-1 text-slate-500 hover:text-red-500 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className={labelClass}>Google Drive URL</label>
              <input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddDoc()} placeholder="https://docs.google.com/..." className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Document name <span className="normal-case font-normal text-slate-500">(optional)</span></label>
              <input value={docName} onChange={(e) => setDocName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddDoc()} placeholder="e.g. Brand Guidelines" className={fieldClass} />
            </div>
            {addError && <p className="text-[12px] text-red-500">{addError}</p>}
            <button onClick={handleAddDoc} disabled={adding || !driveUrl.trim()} className="flex items-center gap-1.5 text-[12px] border border-[var(--border)] hover:border-[rgba(41,151,255,0.3)] hover:bg-[rgba(41,151,255,0.04)] disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 px-3 py-2 rounded-xl transition-colors">
              {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} strokeWidth={2.5} />}
              {adding ? "Adding…" : "Add document"}
            </button>
          </>
        )}

        {/* Step 2: PMS */}
        {step === 2 && (
          pmsConnected ? (
            <div className="flex items-center gap-2.5 py-2">
              <div className="w-5 h-5 rounded-full bg-[rgba(48,209,88,0.15)] flex items-center justify-center flex-shrink-0">
                <Check size={11} className="text-[#30d158]" strokeWidth={2.5} />
              </div>
              <span className="text-[13px] font-medium text-[#30d158]">PMS connected!</span>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>Provider</label>
                <select value={provider} onChange={(e) => { setProvider(e.target.value as PmsProvider); setCredentials({}); }} className={cn(fieldClass, "appearance-none cursor-pointer")}>
                  {PMS_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {getCredentialFields(provider).map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <input type={field.type ?? "text"} value={credentials[field.key] ?? ""} onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))} placeholder={`Enter ${field.label}`} className={fieldClass} />
                </div>
              ))}
              {pmsError && <p className="text-[12px] text-red-500">{pmsError}</p>}
              <button onClick={handleSavePms} disabled={savingPms} className={primaryBtn}>
                {savingPms ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2.5} />}
                {savingPms ? "Connecting…" : "Connect PMS"}
              </button>
            </>
          )
        )}

        {/* Step 3: Meta Ads */}
        {step === 3 && createdClient && (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="text-[13px] text-slate-600">Not connected</span>
            </div>
            <a href={`/api/v1/meta-ads/connect?tenant_id=${createdClient.id}`} className="inline-flex items-center gap-1.5 text-[12px] bg-[var(--brand)] hover:bg-[#1579d6] text-white font-semibold px-4 py-2 rounded-xl transition-colors">
              Connect Meta Account
            </a>
            <p className="text-[12px] text-slate-500">Connecting will redirect you to Meta. You can also connect later from the Meta Ads tab.</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && createdClient && (
          <>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[rgba(48,209,88,0.06)] border border-[rgba(48,209,88,0.2)]">
              <div className="w-8 h-8 rounded-full bg-[rgba(48,209,88,0.15)] flex items-center justify-center flex-shrink-0">
                <Check size={15} className="text-[#30d158]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-slate-900">{createdClient.name}</p>
                <p className="text-[12px] text-slate-500 font-mono">{createdClient.slug}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Client created",       done: true,            detail: undefined },
                { label: "Knowledge documents",   done: docs.length > 0, detail: docs.length > 0 ? `${docs.length} doc${docs.length > 1 ? "s" : ""} added` : "skipped" },
                { label: "PMS connected",         done: pmsConnected,    detail: pmsConnected ? undefined : "skipped" },
                { label: "Meta Ads",              done: false,           detail: "connect from settings" },
              ].map(({ label, done, detail }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className={cn("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border", done ? "bg-[rgba(48,209,88,0.15)] border-[rgba(48,209,88,0.3)]" : "bg-white border-[var(--border)]")}>
                    {done ? <Check size={9} className="text-[#30d158]" strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                  </div>
                  <span className="text-[12px] text-slate-700 font-medium">{label}</span>
                  {detail && <span className="text-[12px] text-slate-500">— {detail}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border)] flex-shrink-0">
        {step === 0 && (
          <button onClick={handleCreate} disabled={creating || !name.trim()} className={cn(primaryBtn, "ml-auto")}>
            {creating && <Loader2 size={11} className="animate-spin" />}
            {creating ? "Creating…" : "Create client"}
            {!creating && <ChevronRight size={12} />}
          </button>
        )}
        {(step === 1 || step === 2) && (
          <>
            <button onClick={back} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-slate-300 bg-white text-[12px] font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2">
              <ChevronLeft size={14} strokeWidth={2.5} /> Back
            </button>
            <button onClick={advance} className={primaryBtn}>
              Next <ChevronRight size={12} />
            </button>
          </>
        )}
        {step === 3 && (
          <button onClick={advance} className={primaryBtn}>
            Finish setup <ChevronRight size={12} />
          </button>
        )}
        {step === 4 && createdClient && (
          <>
            <div />
            <button onClick={() => onSaved(createdClient)} className={primaryBtn}>
              Open settings <ChevronRight size={12} />
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

export default function SettingsModal({ open, onClose, onClientsChange }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
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
      const res = await fetch("/api/v1/clients?all=1", { headers: { "X-Dashboard-Session": "1" } });
      const json = await res.json();
      if (res.ok) {
        const fetched: ClientRecord[] = json.clients ?? [];
        setClients(fetched);
        setSelectedClientId((current) => {
          if (!current && fetched.length > 0) return fetched[0].id;
          return current;
        });
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) fetchClients(); }, [open, fetchClients]);

  function handleClientAdded(client: ClientRecord) {
    setClients((prev) => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedClientId(client.id);
    setShowAddForm(false);
  }

  function handleClientUpdated(updated: ClientRecord, previous: ClientRecord) {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (updated.is_active !== previous.is_active) onClientsChange?.();
  }

  function handleClientDeleted(id: string) {
    const remaining = clients.filter((c) => c.id !== id);
    setClients(remaining);
    setSelectedClientId(remaining[0]?.id ?? null);
    onClientsChange?.();
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const selectedIndex  = clients.findIndex((c) => c.id === selectedClientId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8" role="dialog" aria-modal="true" aria-label="Settings">
      {/* Backdrop */}
      <button type="button" aria-label="Close settings" className="absolute inset-0 w-full h-full bg-slate-900/40 backdrop-blur-sm border-0 cursor-pointer" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-4xl h-full max-h-[92vh] sm:max-h-[700px] flex rounded-2xl overflow-hidden bg-white border border-[var(--border)] shadow-[0_32px_80px_rgba(15,23,42,0.18)] animate-fade-in"
      >
        {/* Left sidebar — hidden on mobile during wizard */}
        <div className={cn(
          "flex-shrink-0 bg-[rgba(248,250,253,0.98)] border-r border-[var(--border)] flex-col w-full sm:w-[220px]",
          showAddForm ? "hidden sm:flex" : mobileShowDetail ? "hidden sm:flex" : "flex"
        )}>
          {/* Header */}
          <div className="px-4 pt-5 pb-4 border-b border-[var(--border)] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[rgba(41,151,255,0.1)] flex-shrink-0">
                <Gem size={14} className="text-[var(--brand)]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 leading-none">HiddenGem AI</p>
                <p className="text-[12px] uppercase tracking-[0.12em] text-slate-500 mt-0.5">Settings</p>
              </div>
            </div>
          </div>

          {/* Add client button */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <button
              onClick={() => { setShowAddForm(true); setSelectedClientId(null); }}
              className={cn(
                "flex items-center gap-1.5 w-full text-[12px] font-semibold px-3 py-2 rounded-xl transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2",
                showAddForm
                  ? "bg-[rgba(41,151,255,0.1)] text-[var(--brand)] border-[rgba(41,151,255,0.25)]"
                  : "text-[var(--brand)] border-[rgba(41,151,255,0.25)] hover:bg-[rgba(41,151,255,0.06)]"
              )}
            >
              <Plus size={12} strokeWidth={2.5} /> Add client
            </button>
          </div>

          {/* Client list */}
          <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Clients">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={14} className="text-[var(--brand)] animate-spin" />
              </div>
            ) : (
              clients.map((client, idx) => {
                const isSelected = selectedClientId === client.id && !showAddForm;
                const swatch = SWATCH_COLORS[idx % SWATCH_COLORS.length];
                return (
                  <button
                    key={client.id}
                    onClick={() => { setSelectedClientId(client.id); setShowAddForm(false); setMobileShowDetail(true); }}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition-colors mb-0.5 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2",
                      isSelected ? "bg-[rgba(41,151,255,0.08)] border-[rgba(41,151,255,0.18)]" : "border-transparent hover:bg-white hover:border-[var(--border)]"
                    )}
                  >
                    <div className={cn("w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 text-[12px] font-semibold", swatch)}>
                      {getInitials(client.name)}
                    </div>
                    <span className={cn("text-[12px] truncate font-medium flex-1", isSelected ? "text-slate-900" : "text-slate-600")}>
                      {client.name}
                    </span>
                    {!client.is_active && (
                      <span className="text-[12px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex-shrink-0">off</span>
                    )}
                  </button>
                );
              })
            )}
          </nav>

          {/* Close button */}
          <div className="px-3 py-3 border-t border-[var(--border)] flex-shrink-0">
            <button onClick={onClose} className="flex items-center gap-1.5 w-full text-[12px] text-slate-500 hover:text-slate-600 px-2.5 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2">
              <X size={12} /> Close
            </button>
          </div>
        </div>

        {/* Right pane */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden bg-white",
          !showAddForm && !mobileShowDetail && "hidden sm:flex"
        )}>
          {showAddForm ? (
            <>
              {/* Mobile-only close button (sidebar is hidden during wizard) */}
              <div className="flex sm:hidden items-center justify-between px-4 pt-3 pb-0 flex-shrink-0">
                <span className="text-[12px] text-slate-500">New client</span>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2" aria-label="Close settings">
                  <X size={14} />
                </button>
              </div>
              <AddClientWizard
                onSaved={handleClientAdded}
                onCancel={() => {
                  setShowAddForm(false);
                  if (!selectedClientId && clients.length > 0) setSelectedClientId(clients[0].id);
                }}
              />
            </>
          ) : selectedClient ? (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {/* Mobile back button */}
              <button
                onClick={() => setMobileShowDetail(false)}
                className="flex sm:hidden items-center gap-1 mb-4 text-[12px] text-slate-500 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2"
              >
                <ChevronLeft size={13} strokeWidth={2.5} /> Clients
              </button>
              <ClientSettingsPanel key={selectedClient.id} client={selectedClient} clientIndex={selectedIndex} onUpdate={(updated) => handleClientUpdated(updated, selectedClient)} onDelete={handleClientDeleted} />
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={20} className="text-[var(--brand)] animate-spin" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[13px] text-slate-500">Select a client or add a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

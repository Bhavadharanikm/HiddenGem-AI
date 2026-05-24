"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Loader2, ToggleLeft, ToggleRight, FileText, Trash2, X, Plus, RefreshCw, Key, Eye, EyeOff, Zap, LogIn, Infinity, Link2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientRecord = {
  id: string; name: string; slug: string;
  system_prompt: string | null; is_active: boolean; created_at: string;
};

type Props = { client: ClientRecord; clientIndex: number; onUpdate: (updated: ClientRecord) => void; onDelete?: (id: string) => void };

const SWATCH_COLORS = [
  "bg-[rgba(41,151,255,0.12)] text-[#2997ff] border-[rgba(41,151,255,0.2)]",
  "bg-[rgba(255,159,10,0.12)] text-[#ff9f0a] border-[rgba(255,159,10,0.2)]",
  "bg-[rgba(48,209,88,0.12)] text-[#30d158] border-[rgba(48,209,88,0.2)]",
  "bg-[rgba(191,90,242,0.12)] text-[#bf5af2] border-[rgba(191,90,242,0.2)]",
];

function getInitials(n: string) { return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }
function toSlug(n: string) { return n.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim(); }
function formatDate(d: string | null) { return d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : null; }
function formatDateTime(d: string | null) { return d ? new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null; }

type Tab = "general" | "knowledge" | "pms" | "meta" | "ghl" | "performance" | "audiences";
const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" }, { id: "knowledge", label: "Knowledge Base" },
  { id: "pms", label: "PMS Data" }, { id: "meta", label: "Meta Ads" },
  { id: "ghl", label: "GoHighLevel" },
  { id: "performance", label: "Performance" }, { id: "audiences", label: "Audiences" },
];

const field = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-500 outline-none focus:border-[rgba(41,151,255,0.4)] focus:ring-2 focus:ring-[rgba(41,151,255,0.12)] transition-all";
const lbl   = "text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-600 block mb-1.5";
const btn   = "flex items-center gap-1.5 text-[12px] bg-[var(--brand)] hover:bg-[#1579d6] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.35)] focus-visible:ring-offset-2";

type KDoc = { id: string; name: string; google_doc_url: string; mime_type: string | null; status: "pending"|"processing"|"ready"|"error"; error_msg?: string | null; last_modified_at: string | null; created_at: string };
type PmsCon = { id: string; provider: string; last_sync_at: string | null; sync_status: string; is_active: boolean };

function StatusBadge({ status }: { status: string }) {
  if (status === "ready")  return <span className="text-[12px] px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.12)] text-[#30d158] border border-[rgba(48,209,88,0.2)]">ready</span>;
  if (status === "error")  return <span className="text-[12px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">error</span>;
  return <span className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full bg-[rgba(41,151,255,0.1)] text-[var(--brand)] border border-[rgba(41,151,255,0.2)]"><Loader2 size={10} className="animate-spin" />{status}</span>;
}

function GeneralTab({ client, onUpdate, onDelete }: { client: ClientRecord; onUpdate: (c: ClientRecord) => void; onDelete?: (id: string) => void }) {
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [sp, setSp]     = useState(client.system_prompt ?? "");
  const [active, setActive] = useState(client.is_active);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);
  const [ok, setOk]         = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(false);
  const [deleting, setDeleting]               = useState(false);
  const [deleteErr, setDeleteErr]             = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  useEffect(() => { setName(client.name); setSlug(client.slug); setSp(client.system_prompt ?? ""); setActive(client.is_active); }, [client]);

  const isDirty = name !== client.name || slug !== client.slug || sp !== (client.system_prompt ?? "") || active !== client.is_active;

  async function save() {
    if (!name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr(null); setOk(false);
    try {
      const res = await fetch(`/api/v1/clients/${client.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" }, body: JSON.stringify({ name, slug, system_prompt: sp || null, is_active: active }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onUpdate(json.client); setOk(true); setTimeout(() => setOk(false), 2000);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true); setDeleteErr(null);
    try {
      const res = await fetch(`/api/v1/clients/${client.id}`, { method: "DELETE", headers: { "X-Dashboard-Session": "1" } });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Delete failed"); }
      onDelete?.(client.id);
    } catch (e) { setDeleteErr(e instanceof Error ? e.message : "Delete failed"); setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <div><label className={lbl}>Client name</label><input value={name} onChange={(e) => { setName(e.target.value); setSlug(toSlug(e.target.value)); }} className={field} /></div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={active ? "Deactivate client" : "Activate client"} onClick={() => setActive((v) => !v)} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2 rounded">
          {active ? <ToggleRight size={22} className="text-[var(--brand)]" /> : <ToggleLeft size={22} className="text-slate-300" />}
        </button>
        <span className="text-[13px] text-slate-700">Active</span>
      </div>
      {err && <p className="text-[12px] text-red-500">{err}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || !isDirty} className={btn}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
          {saving ? "Saving…" : ok ? "Saved!" : "Save changes"}
        </button>
        {isDirty && !saving && (
          <span className="text-[12px] text-amber-500 font-medium">Unsaved changes</span>
        )}
      </div>

      {/* Danger zone */}
      <div className="pt-4 mt-2 border-t border-[var(--border)]">
        <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-3">Danger zone</p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-[12px] font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          >
            <Trash2 size={13} strokeWidth={2} /> Delete client
          </button>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-3">
            <p className="text-[13px] font-semibold text-red-700">Delete "{client.name}"?</p>
            <p className="text-[12px] text-red-600 leading-relaxed">This permanently deletes all conversations, PMS data, knowledge docs, and connections. This cannot be undone.</p>
            <div className="space-y-1.5">
              <label className="text-[12px] text-red-600">Type <strong>Delete {client.name}</strong> to confirm:</label>
              <input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={`Delete ${client.name}`}
                className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                disabled={deleting}
              />
            </div>
            {deleteErr && <p className="text-[12px] text-red-700 font-medium">{deleteErr}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmName !== `Delete ${client.name}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} strokeWidth={2.5} />}
                {deleting ? "Deleting…" : "Yes, delete permanently"}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteErr(null); setDeleteConfirmName(""); }}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-[12px] text-red-600 hover:bg-red-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const DOC_NAME_OPTIONS = [
  "Master Brand Document",
  "Client Overall Internal Performance Data",
  "Client's Audience Assets",
  "Promotional Campaign History",
  "Email Performance",
] as const;

function KnowledgeTab({ clientId }: { clientId: string }) {
  const [docs, setDocs]         = useState<KDoc[]>([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState<string | null>(null);
  const [url, setUrl]           = useState("");
  const [dname, setDname]       = useState("");
  const [adding, setAdding]     = useState(false);
  const [addErr, setAddErr]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { const r = await fetch(`/api/v1/clients/${clientId}/knowledge`, { headers: { "X-Dashboard-Session": "1" } }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setDocs(j.docs); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to load"); } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Auto-retry any stuck pending/error docs on mount
  useEffect(() => {
    const stuck = docs.some((d) => d.status === "pending" || d.status === "error");
    if (!stuck) return;
    fetch(`/api/v1/clients/${clientId}/knowledge`, { method: "PATCH", headers: { "X-Dashboard-Session": "1" } }).catch(() => {});
  }, [docs, clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while any doc is still processing or pending
  useEffect(() => {
    const inFlight = docs.some((d) => d.status === "pending" || d.status === "processing");
    if (!inFlight) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/v1/clients/${clientId}/knowledge`, { headers: { "X-Dashboard-Session": "1" } });
      const j = await r.json();
      if (r.ok) setDocs(j.docs);
    }, 2500);
    return () => clearTimeout(t);
  }, [docs, clientId]);

  async function add() {
    if (!dname) { setAddErr("Please select a document name"); return; }
    if (!url.trim()) { setAddErr("Please enter a Google Drive URL"); return; }
    setAdding(true); setAddErr(null);
    try { const r = await fetch(`/api/v1/clients/${clientId}/knowledge`, { method: "POST", headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" }, body: JSON.stringify({ drive_url: url.trim(), name: dname }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setUrl(""); setDname(""); await load(); }
    catch (e) { setAddErr(e instanceof Error ? e.message : "Failed to add"); } finally { setAdding(false); }
  }

  async function del(id: string) {
    try { await fetch(`/api/v1/clients/${clientId}/knowledge/${id}`, { method: "DELETE", headers: { "X-Dashboard-Session": "1" } }); setDocs((p) => p.filter((d) => d.id !== id)); } catch { /* ignore */ }
  }

  return (
    <div className="space-y-5">
      <div><h3 className="text-[14px] font-semibold text-slate-900">Knowledge Documents</h3><p className="text-[12px] text-slate-500 mt-1 leading-relaxed">Add Google Drive links. The AI uses these as its knowledge base for this client.</p></div>
      {loading ? <div className="flex justify-center py-10"><Loader2 size={18} className="text-[var(--brand)] animate-spin" /></div>
       : err ? <p className="text-[12px] text-red-500">{err}</p>
       : <div className="space-y-2">
           {docs.length === 0 && <p className="text-[12px] text-slate-500 py-3">No documents yet.</p>}
           {docs.map((doc) => (
             <div key={doc.id} className="rounded-xl bg-[rgba(41,151,255,0.04)] border border-[var(--border)]">
               <div className="flex items-center gap-3 px-3 py-2.5">
                 <FileText size={14} className="text-[var(--brand)] flex-shrink-0" />
                 <div className="flex-1 min-w-0"><p className="text-[12px] text-slate-800 truncate font-medium">{doc.name}</p>{doc.last_modified_at && <p className="text-[12px] text-slate-500 mt-0.5">Modified {formatDate(doc.last_modified_at)}</p>}</div>
                 <StatusBadge status={doc.status} />
                 <button onClick={() => del(doc.id)} aria-label={`Delete ${doc.name}`} className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2"><Trash2 size={13} /></button>
               </div>
               {doc.status === "error" && doc.error_msg && (
                 <p className="px-3 pb-2.5 text-[12px] text-red-500 leading-relaxed">{doc.error_msg}</p>
               )}
             </div>
           ))}
         </div>}
      <div className="pt-3 border-t border-[var(--border)] space-y-3">
        <div>
          <label className={lbl}>Document name</label>
          <select value={dname} onChange={(e) => setDname(e.target.value)} className={cn(field, "appearance-none cursor-pointer")}>
            <option value="">Select a document type…</option>
            {DOC_NAME_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Google Drive URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/..." className={field} /></div>
        {addErr && <p className="text-[12px] text-red-500">{addErr}</p>}
        <button onClick={add} disabled={adding} className={btn}>{adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.5} />}{adding ? "Adding…" : "Add document"}</button>
      </div>
    </div>
  );
}

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
function credFields(p: PmsProvider): { key: string; label: string; type?: string }[] {
  switch (p) {
    case "guesty":    return [{ key: "client_id", label: "Client ID" }, { key: "client_secret", label: "Client Secret", type: "password" }];
    case "hostaway":  return [{ key: "account_id", label: "Account ID" }, { key: "client_secret", label: "Client Secret", type: "password" }];
    case "ownerrez":  return [{ key: "client_id", label: "Client ID" }, { key: "client_secret", label: "Client Secret", type: "password" }];
    case "hostfully": return [{ key: "api_key", label: "API Key", type: "password" }, { key: "agency_uid", label: "Agency UID" }];
    case "beds24":    return [{ key: "entry_id", label: "Entry ID" }, { key: "api_key", label: "API Key", type: "password" }];
    case "streamline":
    case "liverez":
    case "track":     return [{ key: "base_url", label: "Base URL" }, { key: "username", label: "Username" }, { key: "password", label: "Password", type: "password" }];
    case "custom":    return [{ key: "base_url", label: "Base URL" }, { key: "api_key", label: "API Key", type: "password" }];
    default:          return [{ key: "api_key", label: "API Key", type: "password" }];
  }
}

function PmsTab({ clientId }: { clientId: string }) {
  const [con, setCon]       = useState<PmsCon | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState<string | null>(null);
  const [form, setForm]     = useState(false);
  const [prov, setProv]     = useState<PmsProvider>("guesty");
  const [creds, setCreds]   = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [syncOk, setSyncOk] = useState(false);
  const [syncStalled, setSyncStalled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/v1/clients/${clientId}/pms`, { headers: { "X-Dashboard-Session": "1" } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setCon(j.connection);
      if (!j.connection) setForm(true);
      // If the connection is already stuck running (from a previous session), show the stalled banner
      if (j.connection?.sync_status === "running") setSyncStalled(true);
    }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to load"); } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    for (const f of credFields(prov)) { if (!creds[f.key]?.trim()) { setSaveErr(`${f.label} is required`); return; } }
    setSaving(true); setSaveErr(null);
    try { const r = await fetch(`/api/v1/clients/${clientId}/pms`, { method: "POST", headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" }, body: JSON.stringify({ provider: prov, credentials: creds }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setCon(j.connection); setForm(false); setCreds({}); }
    catch (e) { setSaveErr(e instanceof Error ? e.message : "Failed to save"); } finally { setSaving(false); }
  }

  async function resetSync() {
    setSyncStalled(false); setSyncing(false); setSyncErr(null);
    await fetch(`/api/v1/clients/${clientId}/pms`, { method: "PATCH", headers: { "X-Dashboard-Session": "1" } });
    await load();
  }

  async function syncNow() {
    setSyncing(true); setSyncErr(null); setSyncOk(false); setSyncStalled(false);
    try {
      const r = await fetch("/api/v1/pms/sync", { method: "POST", headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" }, body: JSON.stringify({ tenant_id: clientId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message ?? "Sync failed");
      // Poll until sync_status leaves "running", timeout after 12 minutes (background function can run up to 15 min)
      let attempts = 0;
      const MAX_ATTEMPTS = 240; // 240 × 3s = 12 minutes
      const poll = async () => {
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
          await load();
          setSyncing(false);
          setSyncStalled(true);
          return;
        }
        const pr = await fetch(`/api/v1/clients/${clientId}/pms`, { headers: { "X-Dashboard-Session": "1" } });
        const pj = await pr.json();
        const status = pj.connection?.sync_status;
        if (status === "running") {
          setTimeout(poll, 3000);
        } else {
          await load();
          setSyncing(false);
          if (status === "error") {
            setSyncErr("Sync encountered an error. Check credentials and try again.");
          } else {
            setSyncOk(true);
            setTimeout(() => setSyncOk(false), 4000);
          }
        }
      };
      setTimeout(poll, 3000);
    } catch (e) {
      setSyncErr(e instanceof Error ? e.message : "Sync failed");
      setSyncing(false);
    }
  }

  const provLabel = con ? PMS_PROVIDERS.find((p) => p.value === con.provider)?.label ?? con.provider : "";

  return (
    <div className="space-y-5">
      <div><h3 className="text-[14px] font-semibold text-slate-900">Property Management System</h3><p className="text-[12px] text-slate-500 mt-1 leading-relaxed">Connect your PMS to give the AI access to bookings, occupancy, and revenue data. Syncs automatically every 4 hours.</p></div>
      {loading ? <div className="flex justify-center py-10"><Loader2 size={18} className="text-[var(--brand)] animate-spin" /></div>
       : err ? <p className="text-[12px] text-red-500">{err}</p>
       : con && !form ? (
        <div className="space-y-3">
          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[var(--brand)] px-2 py-0.5 rounded-lg bg-[rgba(41,151,255,0.1)] border border-[rgba(41,151,255,0.2)]">{provLabel}</span>
                {con.is_active ? <span className="text-[12px] px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.12)] text-[#30d158] border border-[rgba(48,209,88,0.2)]">active</span> : <span className="text-[12px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">inactive</span>}
              </div>
              <span className="text-[12px] text-slate-500">{con.sync_status === "running" || syncing ? <span className="flex items-center gap-1 text-[var(--brand)]"><Loader2 size={10} className="animate-spin" />syncing</span> : con.sync_status === "error" ? <span className="text-red-500">sync error</span> : "idle"}</span>
            </div>
            <p className="text-[12px] text-slate-600">Last synced: <span className="text-slate-700">{con.last_sync_at ? formatDateTime(con.last_sync_at) : "Never"}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={syncNow} disabled={syncing} className={cn(btn, "text-[12px]")}>
              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} strokeWidth={2.5} />}
              {syncing ? "Syncing in background…" : "Sync now"}
            </button>
            <button onClick={() => setForm(true)} className="text-[12px] text-slate-500 hover:text-slate-600 underline underline-offset-2 transition-colors">Update credentials</button>
          </div>
          {syncOk && <p className="text-[12px] text-[#30d158] font-medium">Sync completed successfully.</p>}
          {syncErr && <p className="text-[12px] text-red-500">{syncErr}</p>}
          {syncStalled && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-1.5">
              <p className="text-[12px] text-amber-700 font-medium">Sync is running in the background — this can take several minutes for large accounts.</p>
              <button onClick={resetSync} className="text-[12px] text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors">Reset sync status</button>
            </div>
          )}
        </div>
       ) : (
        <div className="space-y-4">
          {con && <button onClick={() => setForm(false)} className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-600 transition-colors"><X size={12} />Cancel</button>}
          <div><label className={lbl}>Provider</label><select value={prov} onChange={(e) => { setProv(e.target.value as PmsProvider); setCreds({}); }} className={cn(field, "appearance-none cursor-pointer")}>{PMS_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
          {credFields(prov).map((f) => (<div key={f.key}><label className={lbl}>{f.label}</label><input type={f.type ?? "text"} value={creds[f.key] ?? ""} onChange={(e) => setCreds((prev) => ({ ...prev, [f.key]: e.target.value }))} placeholder={`Enter ${f.label}`} className={field} /></div>))}
          {saveErr && <p className="text-[12px] text-red-500">{saveErr}</p>}
          <button onClick={save} disabled={saving} className={btn}>{saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}{saving ? "Saving…" : "Save connection"}</button>
        </div>
       )}
    </div>
  );
}

type MetaStatus = {
  connected: boolean;
  token_expires_at?: string | null;
  accounts: Array<{ id: string; name: string }>;
};
type MetaAssignment = { ad_account_id: string; account_name: string | null; last_sync_at: string | null; is_active: boolean } | null;

function MetaTab({ clientId }: { clientId: string }) {
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus]               = useState<MetaStatus>({ connected: false, accounts: [] });
  const [assignment, setAssignment]       = useState<MetaAssignment>(null);
  const [selectedId, setSelectedId]       = useState("");
  const [connecting, setConnecting]       = useState(false);
  const [assigning, setAssigning]         = useState(false);
  const [syncing, setSyncing]             = useState(false);
  const [syncOk, setSyncOk]               = useState(false);
  const [err, setErr]                     = useState<string | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [systemToken, setSystemToken]       = useState("");
  const [savingToken, setSavingToken]       = useState(false);
  const [showPassword, setShowPassword]     = useState(false);

  const loadAll = useCallback(async () => {
    setStatusLoading(true); setErr(null);
    try {
      const [sr, ar] = await Promise.all([
        fetch("/api/v1/meta-ads/status", { headers: { "X-Dashboard-Session": "1" } }),
        fetch(`/api/v1/meta-ads/assign?tenant_id=${clientId}`, { headers: { "X-Dashboard-Session": "1" } }),
      ]);
      const [sj, aj] = await Promise.all([sr.json(), ar.json()]);
      if (sr.ok) setStatus(sj.data);
      if (ar.ok) { setAssignment(aj.data.assignment); setSelectedId(aj.data.assignment?.ad_account_id ?? ""); }
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to load"); }
    finally { setStatusLoading(false); }
  }, [clientId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function connect() {
    setConnecting(true); setErr(null);
    try {
      const r = await fetch("/api/v1/meta-ads/connect", { headers: { "X-Dashboard-Session": "1" } });
      const j = await r.json();
      if (!r.ok || !j.data?.auth_url) throw new Error(j.error?.message ?? j.error ?? "Failed to get auth URL");
      window.location.href = j.data.auth_url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to connect");
      setConnecting(false);
    }
  }

  async function saveSystemToken() {
    if (!systemToken.trim()) return;
    setSavingToken(true); setErr(null);
    try {
      const r = await fetch("/api/v1/meta-ads/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ token: systemToken.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message ?? "Invalid token");
      setSystemToken("");
      setShowTokenInput(false);
      await loadAll();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to save token"); }
    finally { setSavingToken(false); }
  }

  async function assign() {
    if (!selectedId) return;
    setAssigning(true); setErr(null);
    try {
      const accountName = status.accounts.find((a) => a.id === selectedId)?.name;
      const r = await fetch("/api/v1/meta-ads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ tenant_id: clientId, ad_account_id: selectedId, account_name: accountName }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message ?? "Failed to assign");
      setAssignment(j.data.assignment);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to assign"); }
    finally { setAssigning(false); }
  }

  async function syncNow() {
    setSyncing(true); setSyncOk(false); setErr(null);
    try {
      const r = await fetch("/api/v1/meta-ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ tenant_id: clientId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message ?? "Sync failed");
      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 4000);
      await loadAll();
    } catch (e) { setErr(e instanceof Error ? e.message : "Sync failed"); }
    finally { setSyncing(false); }
  }

  const isSystemToken = status.connected && !status.token_expires_at;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Meta Advertising Account</h3>
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
          One agency-level connection manages all clients. Connect once, then assign each client to their ad account.
        </p>
      </div>

      {statusLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={18} className="text-[var(--brand)] animate-spin" /></div>
      ) : (
        <>
          {/* ── Connected status banner ───────────────────────────── */}
          {status.connected && !showTokenInput && (
            <div className={cn(
              "rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3",
              isSystemToken
                ? "bg-[rgba(48,209,88,0.06)] border-[rgba(48,209,88,0.22)]"
                : "bg-[rgba(41,151,255,0.05)] border-[rgba(41,151,255,0.2)]"
            )}>
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0",
                isSystemToken ? "bg-[rgba(48,209,88,0.15)]" : "bg-[rgba(41,151,255,0.12)]"
              )}>
                {isSystemToken
                  ? <Infinity size={16} className="text-[#30d158]" strokeWidth={2} />
                  : <LogIn size={16} className="text-[var(--brand)]" strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-semibold text-slate-800">
                    {isSystemToken ? "System User Token" : "Facebook OAuth"}
                  </span>
                  <span className={cn(
                    "text-[12px] font-semibold px-2 py-0.5 rounded-full border",
                    isSystemToken
                      ? "bg-[rgba(48,209,88,0.12)] text-[#30d158] border-[rgba(48,209,88,0.2)]"
                      : "bg-[rgba(41,151,255,0.1)] text-[var(--brand)] border-[rgba(41,151,255,0.2)]"
                  )}>connected</span>
                </div>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {isSystemToken
                    ? "Permanent · never expires · covers all assigned ad accounts"
                    : `Expires ${formatDate(status.token_expires_at ?? null) ?? "unknown"}`}
                </p>
              </div>
              <button
                onClick={() => setShowTokenInput(true)}
                className="text-[12px] text-slate-500 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0 underline underline-offset-2"
              >
                Change
              </button>
            </div>
          )}

          {/* ── Connection method picker (not connected, or changing) ── */}
          {(!status.connected || showTokenInput) && (
            <div className="space-y-3">
              {showTokenInput && status.connected && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-700">Switch connection method</span>
                  <button
                    onClick={() => { setShowTokenInput(false); setSystemToken(""); setErr(null); }}
                    className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-600 transition-colors"
                  >
                    <X size={12} /> Cancel
                  </button>
                </div>
              )}

              {/* Two method cards */}
              {!showTokenInput && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* OAuth card */}
                  <button
                    onClick={connect}
                    disabled={connecting}
                    className="group text-left w-full bg-white border border-[var(--border)] hover:border-[rgba(41,151,255,0.4)] hover:shadow-[0_0_0_3px_rgba(41,151,255,0.08)] rounded-2xl p-4 transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[rgba(41,151,255,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[rgba(41,151,255,0.16)] transition-colors">
                        {connecting ? <Loader2 size={16} className="text-[var(--brand)] animate-spin" /> : <LogIn size={16} className="text-[var(--brand)]" strokeWidth={2} />}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800 leading-tight">
                          {connecting ? "Redirecting…" : "Facebook Login"}
                        </p>
                        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                          OAuth flow · re-auth every 60 days
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* System token card */}
                  <button
                    onClick={() => setShowTokenInput(true)}
                    className="group text-left w-full bg-white border-2 border-[rgba(41,151,255,0.25)] hover:border-[var(--brand)] hover:shadow-[0_0_0_3px_rgba(41,151,255,0.1)] rounded-2xl p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2 relative overflow-hidden"
                  >
                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-[12px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--brand)] text-white">
                        Recommended
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[rgba(41,151,255,0.12)] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[rgba(41,151,255,0.2)] transition-colors">
                        <Key size={16} className="text-[var(--brand)]" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800 leading-tight">System User Token</p>
                        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                          Permanent · one token · all accounts
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Token paste form */}
              {showTokenInput && (
                <div className="bg-white border-2 border-[rgba(41,151,255,0.25)] rounded-2xl p-4 space-y-4 shadow-[0_4px_20px_rgba(41,151,255,0.08)]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[rgba(41,151,255,0.1)] flex items-center justify-center flex-shrink-0">
                      <Key size={16} className="text-[var(--brand)]" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">System User Token</p>
                      <p className="text-[12px] text-slate-500">Permanent · covers all assigned ad accounts</p>
                    </div>
                  </div>

                  <div className="bg-[rgba(41,151,255,0.04)] border border-[rgba(41,151,255,0.14)] rounded-xl px-3 py-2.5 space-y-1">
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      Generate this token in <strong className="text-slate-700">Meta Business Manager → System Users → Generate Token</strong>. Assign the system user to each client's ad account first.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className={lbl}>Access token</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={systemToken}
                        onChange={(e) => setSystemToken(e.target.value)}
                        placeholder="EAABwzL..."
                        className={cn(field, "pr-10 font-mono text-[12px]")}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide token" : "Show token"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={saveSystemToken}
                      disabled={savingToken || !systemToken.trim()}
                      className={cn(btn, "w-full sm:w-auto justify-center")}
                    >
                      {savingToken ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                      {savingToken ? "Validating…" : "Save token"}
                    </button>
                    {!status.connected && (
                      <button
                        onClick={connect}
                        disabled={connecting}
                        className="flex items-center justify-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-xl border border-[var(--border)] text-slate-600 hover:border-[rgba(41,151,255,0.3)] hover:text-slate-800 transition-all w-full sm:w-auto disabled:opacity-50"
                      >
                        {connecting ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} strokeWidth={2} />}
                        {connecting ? "Redirecting…" : "Use Facebook Login instead"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Ad account assignment ─────────────────────────────── */}
          {status.connected && !showTokenInput && (
            <div className="bg-white border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-700">Client Ad Account</span>
                {assignment && (
                  <button
                    onClick={() => setAssignment(null)}
                    className="text-[12px] text-slate-500 hover:text-slate-600 transition-colors underline underline-offset-2"
                  >
                    Change
                  </button>
                )}
              </div>

              {assignment ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-semibold text-[var(--brand)] px-2.5 py-1 rounded-lg bg-[rgba(41,151,255,0.08)] border border-[rgba(41,151,255,0.2)]">
                      {assignment.account_name ?? `act_${assignment.ad_account_id}`}
                    </span>
                    <span className="text-[12px] text-slate-500 font-mono">act_{assignment.ad_account_id}</span>
                  </div>
                  {assignment.last_sync_at && (
                    <p className="text-[12px] text-slate-500">Last synced: {formatDateTime(assignment.last_sync_at)}</p>
                  )}
                  <button onClick={syncNow} disabled={syncing} className={cn(btn, "w-full sm:w-auto justify-center sm:justify-start")}>
                    {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} strokeWidth={2.5} />}
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                  {syncOk && (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#30d158] font-medium">
                      <Check size={13} strokeWidth={2.5} /> Sync completed successfully.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {status.accounts.length > 0 ? (
                    <>
                      <p className="text-[12px] text-slate-500">Select which ad account belongs to this client:</p>
                      <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className={cn(field, "appearance-none cursor-pointer")}
                      >
                        <option value="">— select an ad account —</option>
                        {status.accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} (act_{a.id})</option>
                        ))}
                      </select>
                      <button onClick={assign} disabled={assigning || !selectedId} className={cn(btn, "w-full sm:w-auto justify-center sm:justify-start")}>
                        {assigning ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                        {assigning ? "Assigning…" : "Assign account"}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-xl bg-slate-50 border border-[var(--border)] px-3 py-3">
                      <p className="text-[12px] text-slate-500 leading-relaxed">
                        No ad accounts found. Make sure the system user has been assigned ad accounts in Meta Business Manager, then reconnect.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {err && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
              <X size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-600">{err}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type GhlConn = { id: string; location_id: string; location_name: string | null; is_active: boolean; updated_at: string };

function GhlTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [loading, setLoading]       = useState(true);
  const [conn, setConn]             = useState<GhlConn | null>(null);
  const [locationId, setLocationId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [locationName, setLocationName] = useState(clientName);
  const [showToken, setShowToken]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [err, setErr]               = useState<string | null>(null);
  const [ok, setOk]                 = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/v1/ghl?tenant_id=${clientId}`, { headers: { "X-Dashboard-Session": "1" } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      setConn(j.connection ?? null);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!locationId.trim()) { setErr("Location ID is required"); return; }
    if (!accessToken.trim()) { setErr("Access token is required"); return; }
    setSaving(true); setErr(null); setOk(false);
    try {
      const r = await fetch(`/api/v1/ghl?tenant_id=${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ location_id: locationId, access_token: accessToken, location_name: locationName || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed to connect");
      setConn(j.connection ?? null); setOk(true); setLocationId(""); setAccessToken(""); setLocationName(clientName);
      setTimeout(() => setOk(false), 3000);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to connect"); }
    finally { setSaving(false); }
  }

  async function disconnect() {
    setDisconnecting(true); setErr(null);
    try {
      await fetch(`/api/v1/ghl?tenant_id=${clientId}`, { method: "DELETE", headers: { "X-Dashboard-Session": "1" } });
      setConn(null);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to disconnect"); }
    finally { setDisconnecting(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">GoHighLevel CRM</h3>
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
          Connect a GoHighLevel sub-account so the AI can look up contacts, conversations, opportunities, appointments, and more via the GoHighLevel MCP server.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={18} className="text-[var(--brand)] animate-spin" /></div>
      ) : conn ? (
        <div className="space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-600">GoHighLevel Sub-Account</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.12)] text-[#30d158] border border-[rgba(48,209,88,0.2)]">connected</span>
            </div>
            {conn.location_name && (
              <p className="text-[13px] font-medium text-slate-800">{conn.location_name}</p>
            )}
            <p className="text-[12px] text-slate-500">Location ID: <span className="font-mono text-slate-700">{conn.location_id}</span></p>
            <p className="text-[11px] text-slate-400">Last updated: {formatDateTime(conn.updated_at)}</p>

            <div className="pt-1">
              <button
                onClick={disconnect}
                disabled={disconnecting}
                className="flex items-center gap-1.5 text-[12px] text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 space-y-2 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[12px] font-semibold text-slate-600 mb-1">Available via AI</p>
            {[
              "Contacts — create, search, update, tag",
              "Conversations — search and send messages",
              "Opportunities — pipeline and stage management",
              "Appointments — calendar events and notes",
              "Payments — orders and transactions",
            ].map((cap) => (
              <div key={cap} className="flex items-start gap-2">
                <Check size={13} className="text-[#30d158] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <span className="text-[12px] text-slate-700">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 space-y-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div>
            <p className="text-[12px] font-semibold text-slate-600 mb-1">How to connect</p>
            <ol className="space-y-1 text-[12px] text-slate-500 list-decimal list-inside leading-relaxed">
              <li>In GoHighLevel → Settings → Private Integrations → create a new integration</li>
              <li>Select scopes: contacts, conversations, opportunities, calendars, payments</li>
              <li>Copy the token and your sub-account Location ID below</li>
            </ol>
          </div>

          <div className="space-y-3">
            <div>
              <label className={lbl}>Location name <span className="font-normal normal-case text-slate-400">(optional)</span></label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Sunrise Beach Villas"
                className={field}
              />
            </div>
            <div>
              <label className={lbl}>Location ID</label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="e.g. abc123XYZ"
                className={field}
              />
            </div>
            <div>
              <label className={lbl}>Private Integration Token</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="eyJ…"
                  className={cn(field, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {err && <p className="text-[12px] text-red-600">{err}</p>}
          {ok  && <p className="text-[12px] text-[#30d158] font-medium">Connected successfully.</p>}

          <button
            onClick={save}
            disabled={saving || !locationId.trim() || !accessToken.trim()}
            className={cn(btn, "w-full sm:w-auto justify-center")}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
            {saving ? "Verifying…" : "Connect GoHighLevel"}
          </button>
        </div>
      )}
    </div>
  );
}

function PerformanceTab() {
  return (
    <div className="space-y-5">
      <div><h3 className="text-[14px] font-semibold text-slate-900">Performance Data</h3><p className="text-[12px] text-slate-500 mt-1 leading-relaxed">Metrics are automatically calculated from connected PMS and Meta Ads data.</p></div>
      <div className="bg-white border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        {[["Occupancy rate", "from PMS bookings"], ["Average daily rate (ADR)", "from PMS revenue"], ["RevPAR", "calculated from occupancy × ADR"], ["ROAS", "from Meta Ads spend vs revenue"], ["CTR & CPM", "from Meta Ads insights"]].map(([l, d]) => (
          <div key={l} className="flex items-start gap-2.5"><Check size={14} className="text-[#30d158] flex-shrink-0 mt-0.5" strokeWidth={2.5} /><div><span className="text-[12px] text-slate-800 font-medium">{l}</span><span className="text-[12px] text-slate-500"> — {d}</span></div></div>
        ))}
      </div>
      <p className="text-[12px] text-slate-500 leading-relaxed">Data refreshes every 2–4 hours once PMS and Meta Ads are connected.</p>
    </div>
  );
}

function AudiencesTab() {
  return (
    <div className="space-y-5">
      <div><h3 className="text-[14px] font-semibold text-slate-900">Audience Assets & Campaign History</h3><p className="text-[12px] text-slate-500 mt-1 leading-relaxed">Synced from your connected Meta Ads account.</p></div>
      {[["Custom Audiences", "Once connected, custom, lookalike, and saved audiences will appear here."], ["Campaign History", "Campaign history is imported from Meta Ads. The AI uses this to analyse past performance."]].map(([t, b]) => (
        <div key={t}>
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-600 mb-2">{t}</h4>
          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"><p className="text-[12px] text-slate-500 leading-relaxed">{b}</p><p className="text-[12px] text-slate-500 mt-2">Connect Meta Ads to enable this.</p></div>
        </div>
      ))}
    </div>
  );
}

export default function ClientSettingsPanel({ client, clientIndex, onUpdate, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const swatch = SWATCH_COLORS[clientIndex % SWATCH_COLORS.length];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-5 flex-shrink-0">
        <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 text-[13px] font-semibold", swatch)}>{getInitials(client.name)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-slate-900 truncate leading-tight">{client.name}</p>
        </div>
        <span className={cn("text-[12px] px-2.5 py-0.5 rounded-full border flex-shrink-0 font-medium", client.is_active ? "bg-[rgba(48,209,88,0.1)] text-[#30d158] border-[rgba(48,209,88,0.2)]" : "bg-slate-100 text-slate-500 border-slate-200")}>
          {client.is_active ? "active" : "inactive"}
        </span>
      </div>

      <div className="flex items-center border-b border-[var(--border)] mb-5 flex-shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("text-[12px] px-3 py-2.5 whitespace-nowrap border-b-2 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-offset-2 focus-visible:ring-inset",
              activeTab === tab.id ? "text-[var(--brand)] border-[var(--brand)]" : "text-slate-500 hover:text-slate-800 border-transparent")}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "general"     && <GeneralTab client={client} onUpdate={onUpdate} onDelete={onDelete} />}
        {activeTab === "knowledge"   && <KnowledgeTab clientId={client.id} />}
        {activeTab === "pms"         && <PmsTab clientId={client.id} />}
        {activeTab === "meta"        && <MetaTab clientId={client.id} />}
        {activeTab === "ghl"         && <GhlTab clientId={client.id} clientName={client.name} />}
        {activeTab === "performance" && <PerformanceTab />}
        {activeTab === "audiences"   && <AudiencesTab />}
      </div>
    </div>
  );
}

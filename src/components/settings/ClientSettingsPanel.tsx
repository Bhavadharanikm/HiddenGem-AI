"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Loader2, ToggleLeft, ToggleRight, FileText, Trash2, X, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientRecord = {
  id: string; name: string; slug: string;
  system_prompt: string | null; is_active: boolean; created_at: string;
};

type Props = { client: ClientRecord; clientIndex: number; onUpdate: (updated: ClientRecord) => void };

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

type Tab = "general" | "knowledge" | "pms" | "meta" | "performance" | "audiences";
const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" }, { id: "knowledge", label: "Knowledge Base" },
  { id: "pms", label: "PMS Data" }, { id: "meta", label: "Meta Ads" },
  { id: "performance", label: "Performance" }, { id: "audiences", label: "Audiences" },
];

const field = "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-[rgba(41,151,255,0.4)] focus:ring-2 focus:ring-[rgba(41,151,255,0.12)] transition-all";
const lbl   = "text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 block mb-1.5";
const btn   = "flex items-center gap-1.5 text-[12px] bg-[var(--brand)] hover:bg-[#1579d6] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.35)]";

type KDoc = { id: string; name: string; google_doc_url: string; mime_type: string | null; status: "pending"|"processing"|"ready"|"error"; error_msg?: string | null; last_modified_at: string | null; created_at: string };
type PmsCon = { id: string; provider: string; last_sync_at: string | null; sync_status: string; is_active: boolean };

function StatusBadge({ status }: { status: string }) {
  if (status === "ready")  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.12)] text-[#30d158] border border-[rgba(48,209,88,0.2)]">ready</span>;
  if (status === "error")  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">error</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[rgba(41,151,255,0.1)] text-[var(--brand)] border border-[rgba(41,151,255,0.2)]"><Loader2 size={10} className="animate-spin" />{status}</span>;
}

function GeneralTab({ client, onUpdate }: { client: ClientRecord; onUpdate: (c: ClientRecord) => void }) {
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [sp, setSp]     = useState(client.system_prompt ?? "");
  const [active, setActive] = useState(client.is_active);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);
  const [ok, setOk]         = useState(false);

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

  return (
    <div className="space-y-4">
      <div><label className={lbl}>Client name</label><input value={name} onChange={(e) => { setName(e.target.value); setSlug(toSlug(e.target.value)); }} className={field} /></div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setActive((v) => !v)} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] rounded">
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
          <span className="text-[11px] text-amber-500 font-medium">Unsaved changes</span>
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
           {docs.length === 0 && <p className="text-[12px] text-slate-400 py-3">No documents yet.</p>}
           {docs.map((doc) => (
             <div key={doc.id} className="rounded-xl bg-[rgba(41,151,255,0.04)] border border-[var(--border)]">
               <div className="flex items-center gap-3 px-3 py-2.5">
                 <FileText size={14} className="text-[var(--brand)] flex-shrink-0" />
                 <div className="flex-1 min-w-0"><p className="text-[12px] text-slate-800 truncate font-medium">{doc.name}</p>{doc.last_modified_at && <p className="text-[11px] text-slate-400 mt-0.5">Modified {formatDate(doc.last_modified_at)}</p>}</div>
                 <StatusBadge status={doc.status} />
                 <button onClick={() => del(doc.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
               </div>
               {doc.status === "error" && doc.error_msg && (
                 <p className="px-3 pb-2.5 text-[11px] text-red-500 leading-relaxed">{doc.error_msg}</p>
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
      // Poll until sync_status leaves "running", timeout after 2 minutes
      let attempts = 0;
      const MAX_ATTEMPTS = 40; // 40 × 3s = 2 minutes
      const poll = async () => {
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
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
                {con.is_active ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.12)] text-[#30d158] border border-[rgba(48,209,88,0.2)]">active</span> : <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">inactive</span>}
              </div>
              <span className="text-[11px] text-slate-400">{con.sync_status === "running" || syncing ? <span className="flex items-center gap-1 text-[var(--brand)]"><Loader2 size={10} className="animate-spin" />syncing</span> : con.sync_status === "error" ? <span className="text-red-500">sync error</span> : "idle"}</span>
            </div>
            <p className="text-[12px] text-slate-500">Last synced: <span className="text-slate-700">{con.last_sync_at ? formatDateTime(con.last_sync_at) : "Never"}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={syncNow} disabled={syncing} className={cn(btn, "text-[12px]")}>
              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} strokeWidth={2.5} />}
              {syncing ? "Syncing in background…" : "Sync now"}
            </button>
            <button onClick={() => setForm(true)} className="text-[12px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">Update credentials</button>
          </div>
          {syncOk && <p className="text-[12px] text-[#30d158] font-medium">Sync completed successfully.</p>}
          {syncErr && <p className="text-[12px] text-red-500">{syncErr}</p>}
          {syncStalled && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-1.5">
              <p className="text-[12px] text-amber-700 font-medium">Sync is taking longer than expected.</p>
              <button onClick={resetSync} className="text-[12px] text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors">Reset sync status</button>
            </div>
          )}
        </div>
       ) : (
        <div className="space-y-4">
          {con && <button onClick={() => setForm(false)} className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-600 transition-colors"><X size={12} />Cancel</button>}
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

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">Meta Advertising Account</h3>
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">One agency Meta account manages all clients. Connect once, then assign each client to their ad account.</p>
      </div>

      {statusLoading ? (
        <div className="flex justify-center py-10"><Loader2 size={18} className="text-[var(--brand)] animate-spin" /></div>
      ) : (
        <>
          {/* Agency connection status */}
          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-600">Agency Connection</span>
              {status.connected
                ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.12)] text-[#30d158] border border-[rgba(48,209,88,0.2)]">connected</span>
                : <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">not connected</span>}
            </div>
            {status.connected && status.token_expires_at && (
              <p className="text-[11px] text-slate-400">Token expires: {formatDate(status.token_expires_at)}</p>
            )}
            <button onClick={connect} disabled={connecting} className={cn(btn, "text-[12px]")}>
              {connecting ? <Loader2 size={12} className="animate-spin" /> : null}
              {connecting ? "Redirecting…" : status.connected ? "Reconnect Meta Account" : "Connect Meta Account"}
            </button>
          </div>

          {/* Ad account assignment (only shown when agency is connected) */}
          {status.connected && (
            <div className="bg-white border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <span className="text-[12px] font-semibold text-slate-600">Client Ad Account</span>
              {assignment ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[var(--brand)] px-2 py-0.5 rounded-lg bg-[rgba(41,151,255,0.1)] border border-[rgba(41,151,255,0.2)]">
                      {assignment.account_name ?? `act_${assignment.ad_account_id}`}
                    </span>
                    <span className="text-[11px] text-slate-400">act_{assignment.ad_account_id}</span>
                  </div>
                  {assignment.last_sync_at && (
                    <p className="text-[12px] text-slate-500">Last synced: <span className="text-slate-700">{formatDateTime(assignment.last_sync_at)}</span></p>
                  )}
                  <div className="flex items-center gap-3">
                    <button onClick={syncNow} disabled={syncing} className={cn(btn, "text-[12px]")}>
                      {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} strokeWidth={2.5} />}
                      {syncing ? "Syncing…" : "Sync now"}
                    </button>
                    <button onClick={() => setAssignment(null)} className="text-[12px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">Change account</button>
                  </div>
                  {syncOk && <p className="text-[12px] text-[#30d158] font-medium">Sync completed successfully.</p>}
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
                      <button onClick={assign} disabled={assigning || !selectedId} className={cn(btn, "text-[12px]")}>
                        {assigning ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                        {assigning ? "Assigning…" : "Assign account"}
                      </button>
                    </>
                  ) : (
                    <p className="text-[12px] text-slate-500">No ad accounts found. Make sure the Meta token has <code className="text-[11px] bg-slate-100 px-1 rounded">ads_read</code> permission.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {err && <p className="text-[12px] text-red-500">{err}</p>}
        </>
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
          <div key={l} className="flex items-start gap-2.5"><Check size={14} className="text-[#30d158] flex-shrink-0 mt-0.5" strokeWidth={2.5} /><div><span className="text-[12px] text-slate-800 font-medium">{l}</span><span className="text-[12px] text-slate-400"> — {d}</span></div></div>
        ))}
      </div>
      <p className="text-[12px] text-slate-400 leading-relaxed">Data refreshes every 2–4 hours once PMS and Meta Ads are connected.</p>
    </div>
  );
}

function AudiencesTab() {
  return (
    <div className="space-y-5">
      <div><h3 className="text-[14px] font-semibold text-slate-900">Audience Assets & Campaign History</h3><p className="text-[12px] text-slate-500 mt-1 leading-relaxed">Synced from your connected Meta Ads account.</p></div>
      {[["Custom Audiences", "Once connected, custom, lookalike, and saved audiences will appear here."], ["Campaign History", "Campaign history is imported from Meta Ads. The AI uses this to analyse past performance."]].map(([t, b]) => (
        <div key={t}>
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">{t}</h4>
          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"><p className="text-[12px] text-slate-500 leading-relaxed">{b}</p><p className="text-[11px] text-slate-400 mt-2">Connect Meta Ads to enable this.</p></div>
        </div>
      ))}
    </div>
  );
}

export default function ClientSettingsPanel({ client, clientIndex, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const swatch = SWATCH_COLORS[clientIndex % SWATCH_COLORS.length];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-5 flex-shrink-0">
        <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 text-[13px] font-semibold", swatch)}>{getInitials(client.name)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-slate-900 truncate leading-tight">{client.name}</p>
        </div>
        <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full border flex-shrink-0 font-medium", client.is_active ? "bg-[rgba(48,209,88,0.1)] text-[#30d158] border-[rgba(48,209,88,0.2)]" : "bg-slate-100 text-slate-400 border-slate-200")}>
          {client.is_active ? "active" : "inactive"}
        </span>
      </div>

      <div className="flex items-center border-b border-[var(--border)] mb-5 flex-shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("text-[12px] px-3 py-2.5 whitespace-nowrap border-b-2 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(41,151,255,0.3)] focus-visible:ring-inset",
              activeTab === tab.id ? "text-[var(--brand)] border-[var(--brand)]" : "text-slate-500 hover:text-slate-800 border-transparent")}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "general"     && <GeneralTab client={client} onUpdate={onUpdate} />}
        {activeTab === "knowledge"   && <KnowledgeTab clientId={client.id} />}
        {activeTab === "pms"         && <PmsTab clientId={client.id} />}
        {activeTab === "meta"        && <MetaTab clientId={client.id} />}
        {activeTab === "performance" && <PerformanceTab />}
        {activeTab === "audiences"   && <AudiencesTab />}
      </div>
    </div>
  );
}

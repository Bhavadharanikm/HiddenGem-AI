"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check,
  Loader2,
  ToggleLeft,
  ToggleRight,
  FileText,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientRecord = {
  id: string;
  name: string;
  slug: string;
  system_prompt: string | null;
  is_active: boolean;
  created_at: string;
};

type Props = {
  client: ClientRecord;
  clientIndex: number;
  onUpdate: (updated: ClientRecord) => void;
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

type Tab = "general" | "knowledge" | "pms" | "meta" | "performance" | "audiences";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "knowledge", label: "Knowledge Base" },
  { id: "pms", label: "PMS Data" },
  { id: "meta", label: "Meta Ads" },
  { id: "performance", label: "Performance" },
  { id: "audiences", label: "Audiences" },
];

// ─────────────────────────────────────────────────────────────
// Types for sub-sections
// ─────────────────────────────────────────────────────────────

type KnowledgeDoc = {
  id: string;
  name: string;
  google_doc_url: string;
  mime_type: string | null;
  status: "pending" | "processing" | "ready" | "error";
  last_modified_at: string | null;
  created_at: string;
};

type PmsConnection = {
  id: string;
  provider: string;
  last_sync_at: string | null;
  sync_status: string;
  is_active: boolean;
};

type MetaConnection = {
  id: string;
  ad_account_id: string;
  token_expires_at: string | null;
  last_sync_at: string | null;
  is_active: boolean;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
        ready
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
        error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#FAC515]/10 text-[#FAC515] border border-[#FAC515]/20">
      <Loader2 size={10} className="animate-spin" />
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab: General
// ─────────────────────────────────────────────────────────────

function GeneralTab({ client, onUpdate }: { client: ClientRecord; onUpdate: (c: ClientRecord) => void }) {
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [systemPrompt, setSystemPrompt] = useState(client.system_prompt ?? "");
  const [isActive, setIsActive] = useState(client.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setName(client.name);
    setSlug(client.slug);
    setSystemPrompt(client.system_prompt ?? "");
    setIsActive(client.is_active);
  }, [client]);

  async function handleSave() {
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/v1/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ name, slug, system_prompt: systemPrompt || null, is_active: isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onUpdate(json.client);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">Client name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          placeholder="You are the AI assistant for [Client Name]..."
          rows={4}
          className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors resize-none leading-relaxed"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          aria-label={isActive ? "Deactivate client" : "Activate client"}
          className="p-0 border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50 rounded"
        >
          {isActive
            ? <ToggleRight size={22} className="text-[#FAC515]" />
            : <ToggleLeft size={22} className="text-[#555]" />}
        </button>
        <span className="text-[13px] text-[#d8d8d8]">Active</span>
      </div>

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] disabled:opacity-50 text-black font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
      >
        {saving
          ? <Loader2 size={12} className="animate-spin" />
          : success
            ? <Check size={12} strokeWidth={2.5} className="text-black" />
            : <Check size={12} strokeWidth={2.5} />}
        {saving ? "Saving…" : success ? "Saved!" : "Save changes"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab: Knowledge Base
// ─────────────────────────────────────────────────────────────

function KnowledgeTab({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [docName, setDocName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/knowledge`, {
        headers: { "X-Dashboard-Session": "1" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDocs(json.docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleAdd() {
    if (!driveUrl.trim()) {
      setAddError("Please enter a Google Drive URL");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ drive_url: driveUrl.trim(), name: docName.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDriveUrl("");
      setDocName("");
      await fetchDocs();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add document");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(docId: string) {
    try {
      await fetch(`/api/v1/clients/${clientId}/knowledge/${docId}`, {
        method: "DELETE",
        headers: { "X-Dashboard-Session": "1" },
      });
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      // Silently fail — user can retry
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-[#f0f0ef]">Knowledge Documents</h3>
        <p className="text-[12px] text-[#888] mt-1 leading-relaxed">
          Add Google Drive document links. The AI will use these as its knowledge base when answering questions about this client.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={18} className="text-[#FAC515] animate-spin" />
        </div>
      ) : error ? (
        <p className="text-[12px] text-red-400">{error}</p>
      ) : (
        <div className="space-y-2">
          {docs.length === 0 && (
            <p className="text-[12px] text-[#666] py-4">
              No documents yet. Add a Google Drive link below.
            </p>
          )}
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#111] border border-white/[0.05]"
            >
              <FileText size={14} className="text-[#888] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#d8d8d8] truncate font-medium">{doc.name}</p>
                {doc.last_modified_at && (
                  <p className="text-[11px] text-[#666] mt-0.5">
                    Modified {formatDate(doc.last_modified_at)}
                  </p>
                )}
              </div>
              <StatusBadge status={doc.status} />
              <button
                onClick={() => handleDelete(doc.id)}
                aria-label={`Delete ${doc.name}`}
                className="p-1.5 rounded-md text-[#555] hover:text-[#ef4444] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="pt-2 border-t border-white/[0.05] space-y-3">
        <div>
          <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">
            Google Drive URL
          </label>
          <input
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            placeholder="https://docs.google.com/..."
            className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors"
          />
        </div>
        <div>
          <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">
            Document name (optional)
          </label>
          <input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="e.g. Brand Guidelines"
            className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors"
          />
        </div>
        {addError && <p className="text-[12px] text-red-400">{addError}</p>}
        <button
          onClick={handleAdd}
          disabled={adding}
          className="flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] disabled:opacity-50 text-black font-medium px-3 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={2.5} />}
          {adding ? "Adding…" : "Add document"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab: PMS Data
// ─────────────────────────────────────────────────────────────

const PMS_PROVIDERS = [
  { value: "guesty", label: "Guesty" },
  { value: "hostaway", label: "Hostaway" },
  { value: "lodgify", label: "Lodgify" },
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

function PmsTab({ clientId }: { clientId: string }) {
  const [connection, setConnection] = useState<PmsConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState<PmsProvider>("guesty");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/pms`, {
        headers: { "X-Dashboard-Session": "1" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setConnection(json.connection);
      if (!json.connection) setShowForm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PMS connection");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchConnection(); }, [fetchConnection]);

  function handleCredentialChange(key: string, value: string) {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const fields = getCredentialFields(provider);
    for (const f of fields) {
      if (!credentials[f.key]?.trim()) {
        setSaveError(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/pms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Dashboard-Session": "1" },
        body: JSON.stringify({ provider, credentials }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setConnection(json.connection);
      setShowForm(false);
      setCredentials({});
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save connection");
    } finally {
      setSaving(false);
    }
  }

  const providerLabel = connection
    ? PMS_PROVIDERS.find((p) => p.value === connection.provider)?.label ?? connection.provider
    : "";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-[#f0f0ef]">Property Management System</h3>
        <p className="text-[12px] text-[#888] mt-1 leading-relaxed">
          Connect your PMS to give the AI access to bookings, occupancy, and revenue data.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={18} className="text-[#FAC515] animate-spin" />
        </div>
      ) : error ? (
        <p className="text-[12px] text-red-400">{error}</p>
      ) : connection && !showForm ? (
        <div className="space-y-4">
          <div className="bg-[#111] border border-white/[0.05] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[#FAC515] px-2 py-0.5 rounded-md bg-[#FAC515]/10 border border-[#FAC515]/20">
                  {providerLabel}
                </span>
                {connection.is_active ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
                    active
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#888]/10 text-[#888] border border-white/[0.05]">
                    inactive
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#666]">
                {connection.sync_status === "running" ? (
                  <span className="flex items-center gap-1 text-[#FAC515]">
                    <Loader2 size={10} className="animate-spin" />
                    syncing
                  </span>
                ) : connection.sync_status === "error" ? (
                  <span className="text-[#ef4444]">sync error</span>
                ) : (
                  "idle"
                )}
              </span>
            </div>
            <p className="text-[12px] text-[#888]">
              Last synced:{" "}
              <span className="text-[#d8d8d8]">
                {connection.last_sync_at ? formatDate(connection.last_sync_at) : "Never"}
              </span>
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="text-[12px] text-[#888] hover:text-[#ccc] underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
          >
            Update credentials
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {connection && (
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1.5 text-[12px] text-[#888] hover:text-[#ccc] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
            >
              <X size={12} />
              Cancel
            </button>
          )}

          <div>
            <label className="text-[11px] text-[#888] uppercase tracking-wider block mb-1.5">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as PmsProvider);
                setCredentials({});
              }}
              className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] outline-none focus:border-[#FAC515]/40 transition-colors appearance-none"
            >
              {PMS_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
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
                onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                placeholder={`Enter ${field.label}`}
                className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#f0f0ef] placeholder:text-[#444] outline-none focus:border-[#FAC515]/40 transition-colors"
              />
            </div>
          ))}

          {saveError && <p className="text-[12px] text-red-400">{saveError}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] disabled:opacity-50 text-black font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
            {saving ? "Saving…" : "Save connection"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab: Meta Ads
// ─────────────────────────────────────────────────────────────

function MetaTab({ clientId }: { clientId: string }) {
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [loading, setLoading] = useState(false);

  // There is no dashboard-session meta status route yet.
  // The connect flow redirects to Meta OAuth which carries tenant_id as a query param.
  // We show the connect UI directly; connection state is surfaced after OAuth completes.
  void connection;
  void loading;

  const connectUrl = `/api/v1/meta-ads/connect?tenant_id=${clientId}`;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-[#f0f0ef]">Meta Advertising Account</h3>
        <p className="text-[12px] text-[#888] mt-1 leading-relaxed">
          Connect your Meta Ads account to give the AI access to campaign performance, spend, and audience data.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={18} className="text-[#FAC515] animate-spin" />
        </div>
      ) : connection ? (
        <div className="bg-[#111] border border-white/[0.05] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#22c55e]">Connected</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
              active
            </span>
          </div>
          <div className="space-y-1.5">
            <p className="text-[12px] text-[#888]">
              Ad account:{" "}
              <span className="text-[#d8d8d8] font-mono">{connection.ad_account_id}</span>
            </p>
            {connection.token_expires_at && (
              <p className="text-[12px] text-[#888]">
                Token expires:{" "}
                <span className="text-[#d8d8d8]">{formatDate(connection.token_expires_at)}</span>
              </p>
            )}
            <p className="text-[12px] text-[#888]">
              Last synced:{" "}
              <span className="text-[#d8d8d8]">
                {connection.last_sync_at ? formatDate(connection.last_sync_at) : "Never"}
              </span>
            </p>
          </div>
          <button className="text-[12px] text-[#ef4444] hover:text-[#ff6b6b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50">
            Disconnect
          </button>
        </div>
      ) : (
        <div className="bg-[#111] border border-white/[0.05] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#555]" />
            <span className="text-[13px] text-[#888]">Not connected</span>
          </div>
          <a
            href={connectUrl}
            className="inline-flex items-center gap-1.5 text-[12px] bg-[#FAC515] hover:bg-[#e8b310] text-black font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50"
          >
            Connect Meta Account
          </a>
          <p className="text-[11px] text-[#555]">
            Connecting will redirect you to Meta to authorise access.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab: Performance
// ─────────────────────────────────────────────────────────────

function PerformanceTab() {
  const metrics = [
    { label: "Occupancy rate", detail: "from PMS bookings" },
    { label: "Average daily rate (ADR)", detail: "from PMS revenue" },
    { label: "RevPAR", detail: "calculated from occupancy × ADR" },
    { label: "ROAS", detail: "from Meta Ads spend vs revenue" },
    { label: "CTR & CPM", detail: "from Meta Ads insights" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-[#f0f0ef]">Performance Data</h3>
        <p className="text-[12px] text-[#888] mt-1 leading-relaxed">
          Overall performance metrics are automatically calculated from your connected PMS and Meta Ads data.
        </p>
      </div>

      <div className="bg-[#111] border border-white/[0.05] rounded-xl p-4 space-y-3">
        {metrics.map(({ label, detail }) => (
          <div key={label} className="flex items-start gap-2.5">
            <Check size={14} className="text-[#22c55e] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div>
              <span className="text-[12px] text-[#d8d8d8] font-medium">{label}</span>
              <span className="text-[12px] text-[#666]"> — {detail}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-[#666] leading-relaxed">
        Data refreshes automatically every 2–4 hours once your PMS and Meta Ads accounts are connected.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab: Audiences
// ─────────────────────────────────────────────────────────────

function AudiencesTab() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-semibold text-[#f0f0ef]">Audience Assets & Campaign History</h3>
        <p className="text-[12px] text-[#888] mt-1 leading-relaxed">
          Audience segments and promotional campaign history are synced from your connected Meta Ads account.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-[12px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">
            Custom Audiences
          </h4>
          <div className="bg-[#111] border border-white/[0.05] rounded-xl p-4">
            <p className="text-[12px] text-[#666] leading-relaxed">
              Audience data syncs automatically from your Meta Ads connection. Once connected, custom audiences,
              lookalike audiences, and saved audiences will appear here.
            </p>
            <p className="text-[11px] text-[#555] mt-2">
              Connect Meta Ads to enable this.
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-[12px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">
            Campaign History
          </h4>
          <div className="bg-[#111] border border-white/[0.05] rounded-xl p-4">
            <p className="text-[12px] text-[#666] leading-relaxed">
              Campaign history is imported from Meta Ads. The AI uses this data to analyse past campaign
              performance and inform recommendations.
            </p>
            <p className="text-[11px] text-[#555] mt-2">
              Connect Meta Ads to enable this.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main: ClientSettingsPanel
// ─────────────────────────────────────────────────────────────

export default function ClientSettingsPanel({ client, clientIndex, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  const swatchColor = SWATCH_COLORS[clientIndex % SWATCH_COLORS.length];
  const initials = getInitials(client.name);

  return (
    <div className="flex flex-col h-full">
      {/* Client header */}
      <div className="flex items-center gap-3 mb-5 flex-shrink-0">
        <div
          className={cn(
            "w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 text-[13px] font-semibold",
            swatchColor
          )}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-[#f0f0ef] truncate leading-tight">
            {client.name}
          </p>
          <p className="text-[11px] text-[#666] font-mono truncate">{client.slug}</p>
        </div>
        <span
          className={cn(
            "text-[11px] px-2 py-0.5 rounded-full border flex-shrink-0",
            client.is_active
              ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20"
              : "bg-white/[0.03] text-[#666] border-white/[0.06]"
          )}
        >
          {client.is_active ? "active" : "inactive"}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-white/[0.05] mb-5 flex-shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "text-[12px] px-3 py-2.5 whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAC515]/50 focus-visible:ring-inset",
              activeTab === tab.id
                ? "text-[#f0f0ef] border-[#FAC515]"
                : "text-[#888] hover:text-[#ccc] border-transparent"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "general" && <GeneralTab client={client} onUpdate={onUpdate} />}
        {activeTab === "knowledge" && <KnowledgeTab clientId={client.id} />}
        {activeTab === "pms" && <PmsTab clientId={client.id} />}
        {activeTab === "meta" && <MetaTab clientId={client.id} />}
        {activeTab === "performance" && <PerformanceTab />}
        {activeTab === "audiences" && <AudiencesTab />}
      </div>
    </div>
  );
}

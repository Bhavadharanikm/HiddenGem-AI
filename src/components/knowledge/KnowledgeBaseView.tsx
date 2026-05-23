"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, ExternalLink, Loader2, BookOpen } from "lucide-react";

type KDoc = {
  id: string;
  name: string;
  google_doc_url: string;
  status: "pending" | "processing" | "ready" | "error";
  error_msg?: string | null;
  last_modified_at: string | null;
};

function formatDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : null;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <span className="text-[12px] px-2 py-0.5 rounded-full bg-[rgba(48,209,88,0.12)] text-[#30d158] border border-[rgba(48,209,88,0.2)]">Ready</span>;
  if (status === "error") return <span className="text-[12px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">Error</span>;
  return <span className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full bg-[rgba(41,151,255,0.1)] text-[var(--brand)] border border-[rgba(41,151,255,0.2)]"><Loader2 size={10} className="animate-spin" />{status}</span>;
}

export default function KnowledgeBaseView({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [docs, setDocs] = useState<KDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/v1/clients/${clientId}/knowledge`, { headers: { "X-Dashboard-Session": "1" } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDocs(j.docs ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Poll while any doc is still processing/pending
  useEffect(() => {
    const inFlight = docs.some((d) => d.status === "pending" || d.status === "processing");
    if (!inFlight) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/v1/clients/${clientId}/knowledge`, { headers: { "X-Dashboard-Session": "1" } });
      const j = await r.json();
      if (r.ok) setDocs(j.docs ?? []);
    }, 2500);
    return () => clearTimeout(t);
  }, [docs, clientId]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(41,151,255,0.1)] border border-[rgba(41,151,255,0.2)]">
              <BookOpen size={17} className="text-[var(--brand)]" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-slate-900 tracking-[-0.02em]">Knowledge Base</h1>
              <p className="text-[12px] text-slate-500 mt-0.5">{clientName}</p>
            </div>
          </div>
          <p className="text-[13px] text-slate-500 mt-3 leading-relaxed">
            Documents the AI uses as its knowledge base for this client. Add documents in Settings → Knowledge Base.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="text-[var(--brand)] animate-spin" />
          </div>
        ) : err ? (
          <p className="text-[13px] text-red-500">{err}</p>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(15,23,42,0.05)] mb-4">
              <FileText size={20} className="text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-medium text-slate-600 mb-1">No documents yet</p>
            <p className="text-[12px] text-slate-500">Add Google Drive documents in Settings → Knowledge Base.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div key={doc.id} className="rounded-2xl border border-[var(--border)] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(41,151,255,0.08)] border border-[rgba(41,151,255,0.15)]">
                    <FileText size={16} className="text-[var(--brand)]" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-slate-900 truncate">{doc.name}</p>
                    {doc.last_modified_at && (
                      <p className="text-[12px] text-slate-500 mt-0.5">Updated {formatDate(doc.last_modified_at)}</p>
                    )}
                  </div>
                  <StatusBadge status={doc.status} />
                  {doc.status === "ready" && doc.google_doc_url && (
                    <a
                      href={doc.google_doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--brand)] hover:underline flex-shrink-0"
                    >
                      Open <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                {doc.status === "error" && doc.error_msg && (
                  <div className="px-5 pb-4">
                    <p className="text-[12px] text-red-500 leading-relaxed">{doc.error_msg}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

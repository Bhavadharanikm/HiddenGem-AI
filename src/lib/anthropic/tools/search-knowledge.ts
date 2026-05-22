import { getServiceClient } from "@/lib/supabase/service";

export const searchKnowledgeTool = {
  name: "search_knowledge_base",
  description:
    "Search the client's knowledge base documents for relevant information. Use for questions about policies, SOPs, property descriptions, brand guidelines, or any topic that might be in uploaded documents.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The search query",
      },
      num_results: {
        type: "number",
        description: "Number of results to return (default 6)",
      },
    },
    required: ["query"],
  },
};

export async function executeSearchKnowledge(
  tenantId: string,
  input: { query: string; num_results?: number }
) {
  const db = getServiceClient();
  const limit = input.num_results ?? 6;

  const terms = input.query.trim().split(/\s+/).filter(Boolean);

  const { data, error } = await db
    .from("knowledge_chunks")
    .select("content, document_id")
    .eq("tenant_id", tenantId)
    .or(terms.map((t) => `content.ilike.%${t}%`).join(","))
    .limit(limit);

  if (error) throw new Error(`Knowledge search failed: ${error.message}`);
  if (!data?.length) return { results: [], message: "No relevant documents found." };

  const docIds = [...new Set(data.map((r) => r.document_id))];
  const { data: docs } = await db
    .from("knowledge_documents")
    .select("id, name")
    .in("id", docIds);

  const docMap = Object.fromEntries((docs ?? []).map((d) => [d.id, d.name]));

  return {
    results: data.map((r) => ({
      content: r.content,
      document: docMap[r.document_id] ?? "Unknown",
    })),
  };
}

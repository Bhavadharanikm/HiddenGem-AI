import OpenAI from "openai";
import { getServiceClient } from "@/lib/supabase/service";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

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

  // Embed the query
  const embeddingRes = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: input.query,
  });
  const embedding = embeddingRes.data[0].embedding;

  const { data, error } = await db.rpc("match_knowledge_chunks", {
    p_tenant_id: tenantId,
    p_embedding: embedding,
    p_match_count: input.num_results ?? 6,
    p_threshold: 0.68,
  });

  if (error) throw new Error(`Knowledge search failed: ${error.message}`);
  if (!data || data.length === 0) {
    return { results: [], message: "No relevant documents found." };
  }

  return {
    results: data.map((r) => ({
      content: r.content,
      document: r.document_name,
      similarity: Math.round(r.similarity * 100) / 100,
    })),
  };
}

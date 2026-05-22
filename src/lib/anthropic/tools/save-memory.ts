import { getServiceClient } from "@/lib/supabase/service";

export const saveMemoryTool = {
  name: "save_memory",
  description:
    "Save a fact, preference, insight, goal, or issue about this client to long-term memory. Use this when you learn something important that should persist across future conversations — e.g. a client preference, a business goal, a recurring issue, or a key insight about their portfolio.",
  input_schema: {
    type: "object" as const,
    properties: {
      content: {
        type: "string",
        description: "The fact or insight to remember, stated clearly and concisely.",
      },
      category: {
        type: "string",
        enum: ["preference", "insight", "fact", "goal", "issue"],
        description: "Category: preference (how they like things done), insight (analytical observation), fact (objective data point), goal (what they want to achieve), issue (a problem or concern).",
      },
    },
    required: ["content", "category"],
  },
};

export async function executeSaveMemory(
  tenantId: string,
  input: { content: string; category: "preference" | "insight" | "fact" | "goal" | "issue" }
) {
  const db = getServiceClient();
  const { error } = await db.from("client_memories").insert({
    tenant_id: tenantId,
    content: input.content,
    category: input.category,
  });
  if (error) throw new Error(`Failed to save memory: ${error.message}`);
  return { saved: true, content: input.content, category: input.category };
}

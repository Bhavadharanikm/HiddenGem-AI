import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "@/lib/supabase/service";
import { assembleSystemPrompt } from "./context-assembler";
import { ALL_TOOLS, executeTool } from "./tools";
import type { MessageParam } from "@anthropic-ai/sdk/resources";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

// True when Supabase is not configured — agent runs without DB persistence
function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
const MAX_TOOL_ITERATIONS = 10;
const MODEL = "claude-sonnet-4-6";

export type AgentRunOptions = {
  tenantId: string;
  conversationId: string | null;
  userMessage: string;
  source?: "api" | "dashboard" | "widget";
};

export type AgentRunResult = {
  conversationId: string;
  messageId: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
};

export async function runAgent(opts: AgentRunOptions): Promise<AgentRunResult> {
  const db = getServiceClient();
  const { tenantId, userMessage, source = "api" } = opts;

  // Ensure conversation exists
  let conversationId = opts.conversationId;
  if (!conversationId) {
    const title = userMessage.slice(0, 80);
    const { data: conv, error } = await db
      .from("conversations")
      .insert({ tenant_id: tenantId, title, source })
      .select("id")
      .single();
    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    conversationId = conv.id;
  }

  // Load conversation history
  const { data: history } = await db
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messages: MessageParam[] = (history ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content as MessageParam["content"],
  }));

  // Append the new user message
  messages.push({ role: "user", content: userMessage });

  // Persist user message
  await db.from("messages").insert({
    tenant_id: tenantId,
    conversation_id: conversationId,
    role: "user",
    content: userMessage,
  });

  // Assemble system prompt (uses prompt caching for the static portion)
  const systemPrompt = await assembleSystemPrompt(tenantId);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalContent = "";
  let iterations = 0;

  // Tool-use loop
  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: systemPrompt,
          // Prompt caching — the static system prompt is cached between turns
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: ALL_TOOLS,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      finalContent = textBlock?.type === "text" ? textBlock.text : "";
      messages.push({ role: "assistant", content: response.content });
      break;
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults: MessageParam = {
        role: "user",
        content: await Promise.all(
          response.content
            .filter((b) => b.type === "tool_use")
            .map(async (block) => {
              if (block.type !== "tool_use") return null!;
              try {
                const result = await executeTool(
                  tenantId,
                  block.name,
                  block.input as Record<string, unknown>
                );
                return {
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                };
              } catch (err) {
                return {
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
                  is_error: true,
                };
              }
            })
        ),
      };

      messages.push(toolResults);
      continue;
    }

    // Unexpected stop reason
    break;
  }

  // Persist assistant response
  const { data: savedMsg } = await db
    .from("messages")
    .insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      role: "assistant",
      content: finalContent,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      model: MODEL,
    })
    .select("id")
    .single();

  // Update conversation updated_at
  await db
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return {
    conversationId,
    messageId: savedMsg?.id ?? "",
    content: finalContent,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  };
}

// Streaming variant — returns an AsyncIterable of text deltas
export async function* runAgentStream(
  opts: AgentRunOptions
): AsyncGenerator<
  { type: "tool_start"; name: string } | { type: "delta"; text: string } | { type: "done"; conversationId: string; inputTokens: number; outputTokens: number }
> {
  const dbEnabled = isSupabaseConfigured();
  const db = dbEnabled ? getServiceClient() : null;
  const { tenantId, userMessage, source = "api" } = opts;

  let conversationId = opts.conversationId;

  if (dbEnabled && db) {
    if (!conversationId) {
      const title = userMessage.slice(0, 80);
      const { data: conv } = await db
        .from("conversations")
        .insert({ tenant_id: tenantId, title, source })
        .select("id")
        .single();
      conversationId = conv?.id ?? crypto.randomUUID();
    }

    await db.from("messages").insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      role: "user",
      content: userMessage,
    });
  } else {
    conversationId = conversationId ?? crypto.randomUUID();
  }

  // Load history only when DB is available
  const messages: MessageParam[] = [];
  if (dbEnabled && db && opts.conversationId) {
    const { data: history } = await db
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    messages.push(
      ...(history ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content as MessageParam["content"],
      }))
    );
  }
  messages.push({ role: "user", content: userMessage });

  const systemPrompt = dbEnabled
    ? await assembleSystemPrompt(tenantId)
    : "You are a helpful AI assistant for a hospitality marketing agency.";

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let fullContent = "";
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const stream = getAnthropic().messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      tools: dbEnabled ? ALL_TOOLS : [],
      messages,
    });

    const assistantContent: Anthropic.ContentBlock[] = [];

    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        yield { type: "tool_start", name: event.content_block.name };
      }
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullContent += event.delta.text;
        yield { type: "delta", text: event.delta.text };
      }
    }

    const finalMessage = await stream.finalMessage();
    totalInputTokens += finalMessage.usage.input_tokens;
    totalOutputTokens += finalMessage.usage.output_tokens;
    assistantContent.push(...finalMessage.content);
    messages.push({ role: "assistant", content: assistantContent });

    if (finalMessage.stop_reason === "end_turn") break;

    if (finalMessage.stop_reason === "tool_use" && dbEnabled) {
      const toolResults: MessageParam = {
        role: "user",
        content: await Promise.all(
          finalMessage.content
            .filter((b) => b.type === "tool_use")
            .map(async (block) => {
              if (block.type !== "tool_use") return null!;
              try {
                const result = await executeTool(tenantId, block.name, block.input as Record<string, unknown>);
                return { type: "tool_result" as const, tool_use_id: block.id, content: JSON.stringify(result) };
              } catch (err) {
                return { type: "tool_result" as const, tool_use_id: block.id, content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`, is_error: true };
              }
            })
        ),
      };
      messages.push(toolResults);
      continue;
    }
    break;
  }

  if (dbEnabled && db) {
    await db.from("messages").insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      role: "assistant",
      content: fullContent,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      model: MODEL,
    });

    await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }

  yield { type: "done", conversationId, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
}

import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "@/lib/supabase/service";
import { assembleSystemPrompt } from "./context-assembler";
import { ALL_TOOLS, executeTool } from "./tools";
import type { MessageParam } from "@anthropic-ai/sdk/resources";
import type {
  BetaRequestMCPServerURLDefinition,
  BetaMessageParam,
  BetaToolUnion,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

// True when Supabase is not configured — agent runs without DB persistence
function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function buildUserContent(text: string, attachments: AgentAttachment[] = []): MessageParam["content"] {
  if (!attachments.length) return text;
  const blocks: Anthropic.MessageParam["content"] = attachments.map((att) => {
    if (att.mediaType === "application/pdf") {
      return {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: att.data },
      } as unknown as Anthropic.ContentBlockParam;
    }
    return {
      type: "image",
      source: { type: "base64", media_type: att.mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp", data: att.data },
    } as Anthropic.ImageBlockParam;
  });
  if (text) blocks.push({ type: "text", text });
  return blocks as MessageParam["content"];
}

const MAX_TOOL_ITERATIONS = 10;
const MODEL = "claude-sonnet-4-6";
const GHL_MCP_BETA = "mcp-client-2025-11-20" as const;

async function getGhlMcpServer(tenantId: string): Promise<BetaRequestMCPServerURLDefinition | null> {
  try {
    const db = getServiceClient();
    const { data } = await db
      .from("ghl_connections")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();
    if (!data) return null;

    const siteUrl = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL;
    // Fall back to ANTHROPIC_API_KEY as internal secret — always present
    const internalSecret = process.env.CRON_SECRET ?? process.env.ANTHROPIC_API_KEY;

    if (!siteUrl) {
      console.warn("[ghl-mcp] Skipping GHL MCP: URL / NEXT_PUBLIC_SITE_URL is not set");
      return null;
    }
    if (!internalSecret) {
      console.warn("[ghl-mcp] Skipping GHL MCP: no internal secret available");
      return null;
    }

    return {
      type: "url",
      name: "gohighlevel",
      url: `${siteUrl}/api/mcp/ghl/${tenantId}`,
      authorization_token: internalSecret,
    };
  } catch (err) {
    console.error("[ghl-mcp] getGhlMcpServer error:", err);
    return null;
  }
}

export type AgentAttachment = {
  name: string;
  mediaType: string;
  data: string; // base64
};

export type AgentRunOptions = {
  tenantId: string;
  conversationId: string | null;
  userMessage: string;
  attachments?: AgentAttachment[];
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
  const { tenantId, userMessage, attachments = [], source = "api" } = opts;

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

  // Append the new user message (with any attachments as content blocks)
  messages.push({ role: "user", content: buildUserContent(userMessage, attachments) });

  // Persist user message (text only — no base64 in DB)
  await db.from("messages").insert({
    tenant_id: tenantId,
    conversation_id: conversationId,
    role: "user",
    content: userMessage,
  });

  // Assemble system prompt (uses prompt caching for the static portion)
  const systemPrompt = await assembleSystemPrompt(tenantId);

  // Check for active GHL connection → use beta MCP API
  const ghlMcpServer = await getGhlMcpServer(tenantId);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalContent = "";
  let iterations = 0;

  const systemBlocks = [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" } as const }];

  // Tool-use loop
  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = ghlMcpServer
      ? await getAnthropic().beta.messages.create({
          model: MODEL,
          max_tokens: 4096,
          system: systemBlocks,
          tools: [
            ...ALL_TOOLS as BetaToolUnion[],
            { type: "mcp_toolset", mcp_server_name: "gohighlevel" } as BetaToolUnion,
          ],
          mcp_servers: [ghlMcpServer],
          betas: [GHL_MCP_BETA],
          messages: messages as BetaMessageParam[],
        })
      : await getAnthropic().messages.create({
          model: MODEL,
          max_tokens: 4096,
          system: systemBlocks,
          tools: ALL_TOOLS,
          messages,
        });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      finalContent = textBlock?.type === "text" ? textBlock.text : "";
      messages.push({ role: "assistant", content: response.content as MessageParam["content"] });
      break;
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content as MessageParam["content"] });

      type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: unknown };
      const localToolBlocks = (response.content as Array<{ type: string }>).filter(
        (b): b is ToolUseBlock => b.type === "tool_use"
      );
      if (!localToolBlocks.length) break; // only MCP tools — Anthropic handles them

      const toolResults: MessageParam = {
        role: "user",
        content: await Promise.all(
          localToolBlocks.map(async (block) => {
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
  const { tenantId, userMessage, attachments = [], source = "api" } = opts;

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
  messages.push({ role: "user", content: buildUserContent(userMessage, attachments) });

  const systemPrompt = dbEnabled
    ? await assembleSystemPrompt(tenantId)
    : "You are a helpful AI assistant for a hospitality marketing agency.";

  const ghlMcpServer = dbEnabled ? await getGhlMcpServer(tenantId) : null;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let fullContent = "";
  let iterations = 0;

  const streamSystem = [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" } as const }];

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    try {
      const stream = ghlMcpServer
        ? getAnthropic().beta.messages.stream({
            model: MODEL,
            max_tokens: 4096,
            system: streamSystem,
            tools: dbEnabled
              ? [
                  ...ALL_TOOLS as BetaToolUnion[],
                  { type: "mcp_toolset", mcp_server_name: "gohighlevel" } as BetaToolUnion,
                ]
              : [{ type: "mcp_toolset", mcp_server_name: "gohighlevel" } as BetaToolUnion],
            mcp_servers: [ghlMcpServer],
            betas: [GHL_MCP_BETA],
            messages: messages as BetaMessageParam[],
          })
        : getAnthropic().messages.stream({
            model: MODEL,
            max_tokens: 4096,
            system: streamSystem,
            tools: dbEnabled ? ALL_TOOLS : [],
            messages,
          });

      const assistantContent: Anthropic.ContentBlock[] = [];

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          const cb = event.content_block;
          if (cb.type === "tool_use") yield { type: "tool_start", name: cb.name };
          // Show MCP tool use as "GoHighLevel: toolname" in UI
          if ((cb as { type: string; name?: string }).type === "mcp_tool_use") {
            yield { type: "tool_start", name: `GoHighLevel: ${(cb as { name?: string }).name ?? "tool"}` };
          }
        }
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          fullContent += event.delta.text;
          yield { type: "delta", text: event.delta.text };
        }
      }

      const finalMessage = await stream.finalMessage();
      totalInputTokens += finalMessage.usage.input_tokens;
      totalOutputTokens += finalMessage.usage.output_tokens;
      assistantContent.push(...(finalMessage.content as Anthropic.ContentBlock[]));
      messages.push({ role: "assistant", content: assistantContent as MessageParam["content"] });

      if (finalMessage.stop_reason === "end_turn") break;

      if (finalMessage.stop_reason === "tool_use" && dbEnabled) {
        type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: unknown };
        const localToolBlocks = (finalMessage.content as Array<{ type: string }>).filter(
          (b): b is ToolUseBlock => b.type === "tool_use"
        );
        if (!localToolBlocks.length) break; // only MCP tools — handled by Anthropic

        const toolResults: MessageParam = {
          role: "user",
          content: await Promise.all(
            localToolBlocks.map(async (block) => {
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
    } catch (err) {
      throw err;
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

    // Generate a brief summary of this conversation for future context (fire-and-forget)
    generateConversationSummary(db, conversationId, messages, fullContent).catch(() => {});
  }

  yield { type: "done", conversationId, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
}

async function generateConversationSummary(
  db: ReturnType<typeof import("@/lib/supabase/service").getServiceClient>,
  conversationId: string,
  messages: MessageParam[],
  lastAssistantMessage: string
) {
  // Build a compact transcript of the conversation (text only, no tool results)
  const transcript = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const text =
        typeof m.content === "string"
          ? m.content
          : (m.content as Array<{ type: string; text?: string }>)
              .filter((b) => b.type === "text" && b.text)
              .map((b) => (b as { text: string }).text)
              .join(" ");
      return `${m.role === "user" ? "User" : "Assistant"}: ${text.slice(0, 400)}`;
    })
    .join("\n");

  if (!transcript.trim()) return;

  const response = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 256,
    system: "You summarize conversations in 1-3 sentences, capturing the main topics discussed and any decisions or data points that would be useful context in a future conversation. Be specific and concise.",
    messages: [
      {
        role: "user",
        content: `Summarize this conversation:\n\n${transcript}\n\nAssistant final reply: ${lastAssistantMessage.slice(0, 600)}`,
      },
    ],
  });

  const summaryBlock = response.content.find((b) => b.type === "text");
  const summary = summaryBlock?.type === "text" ? summaryBlock.text : null;
  if (!summary) return;

  await db.from("conversations").update({ summary }).eq("id", conversationId);
}

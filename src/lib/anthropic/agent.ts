import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getServiceClient } from "@/lib/supabase/service";
import { assembleSystemPrompt } from "./context-assembler";
import { ALL_TOOLS, executeTool } from "./tools";
import type { MessageParam } from "@anthropic-ai/sdk/resources";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// True when Supabase is not configured — agent runs without DB persistence
function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// 400/402 from Anthropic = billing or auth problem — fall back to OpenAI
function isAnthropicUnavailable(err: unknown): boolean {
  if (err !== null && typeof err === "object" && "status" in err) {
    const s = (err as { status: number }).status;
    return s === 400 || s === 402 || s === 401;
  }
  return false;
}

// Convert Anthropic MessageParams to simple OpenAI role/content pairs
function toOpenAIMessages(msgs: MessageParam[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        typeof m.content === "string"
          ? m.content
          : (m.content as Array<{ type: string; text?: string }>)
              .filter((b) => b.type === "text" && b.text)
              .map((b) => (b as { text: string }).text)
              .join(""),
    }));
}

async function* streamWithOpenAI(
  messages: MessageParam[],
  systemPrompt: string
): AsyncGenerator<{ type: "delta"; text: string }> {
  try {
    const stream = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, ...toOpenAIMessages(messages)],
      stream: true,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) yield { type: "delta" as const, text };
    }
  } catch (err) {
    const status = err !== null && typeof err === "object" && "status" in err
      ? (err as { status: number }).status : 0;
    if (status === 429) {
      throw new Error(
        "Both AI providers are out of credits. Add API credits at platform.openai.com/settings/billing or console.anthropic.com/settings/billing — these are separate from ChatGPT/Claude app subscriptions."
      );
    }
    if (status === 401) {
      throw new Error("OpenAI API key is invalid. Check OPENAI_API_KEY in your Netlify environment variables.");
    }
    throw err;
  }
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

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let fullContent = "";
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    try {
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
    } catch (err) {
      // Anthropic unavailable (billing, auth) — fall back to OpenAI if configured
      if (isAnthropicUnavailable(err) && process.env.OPENAI_API_KEY) {
        for await (const evt of streamWithOpenAI(messages, systemPrompt)) {
          fullContent += evt.text;
          yield evt;
        }
        break;
      }
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

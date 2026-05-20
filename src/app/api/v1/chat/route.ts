import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { runAgentStream } from "@/lib/anthropic/agent";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Edge runtime: no timeout limit, full streaming support on Netlify
export const runtime = "edge";

export async function POST(req: NextRequest) {
  let body: { message: string; conversation_id?: string; stream?: boolean; tenant_id?: string };
  try {
    body = await req.json();
  } catch {
    return error("BAD_REQUEST", "Invalid JSON body");
  }

  // Try API key first, then dashboard session
  const apiKeyAuth = await validateApiKey(req);
  let auth = apiKeyAuth;

  if (!auth && req.headers.get("X-Dashboard-Session") === "1") {
    // Trust the dashboard session header — auth will be added in a later phase.
    // tenant_id must be present in the body to scope the request.
    if (body.tenant_id) {
      auth = { tenantId: body.tenant_id, scopes: ["chat", "read"], keyId: "" };
    }
  }

  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");
  if (!auth.scopes.includes("chat") && !auth.scopes.includes("*")) {
    return error("FORBIDDEN", "API key does not have the 'chat' scope");
  }

  if (!body.message?.trim()) {
    return error("BAD_REQUEST", "'message' is required");
  }

  // Validate required configuration before touching the agent
  if (!process.env.ANTHROPIC_API_KEY) {
    return error(
      "INTERNAL_ERROR",
      "ANTHROPIC_API_KEY is not configured. Add it to your environment variables and redeploy."
    );
  }

  const agentOpts = {
    tenantId: auth.tenantId,
    conversationId: body.conversation_id ?? null,
    userMessage: body.message,
    source: "api" as const,
  };

  // Streaming response (SSE)
  if (body.stream !== false) {
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();

        const send = (data: Record<string, unknown>) => {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let conversationId = "";
          for await (const event of runAgentStream(agentOpts)) {
            if (event.type === "tool_start") {
              send({ type: "tool_start", name: event.name });
            } else if (event.type === "delta") {
              send({ type: "delta", text: event.text });
            } else if (event.type === "done") {
              conversationId = event.conversationId;
              send({
                type: "done",
                conversation_id: event.conversationId,
                input_tokens: event.inputTokens,
                output_tokens: event.outputTokens,
              });

              // Fire webhook
              await dispatchWebhook(auth.tenantId, "chat.completed", {
                conversation_id: event.conversationId,
                input_tokens: event.inputTokens,
                output_tokens: event.outputTokens,
              }).catch(() => {});
            }
          }
          void conversationId;
        } catch (err) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Agent error",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Non-streaming fallback
  try {
    const { runAgent } = await import("@/lib/anthropic/agent");
    const result = await runAgent(agentOpts);
    await dispatchWebhook(auth.tenantId, "chat.completed", {
      conversation_id: result.conversationId,
    }).catch(() => {});
    return ok({
      conversation_id: result.conversationId,
      message_id: result.messageId,
      content: result.content,
      usage: {
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
      },
    });
  } catch (err) {
    console.error("[chat]", err);
    return error("INTERNAL_ERROR", "Agent failed to respond");
  }
}

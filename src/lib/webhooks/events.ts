export type WebhookEventType =
  | "chat.completed"
  | "sync.pms.finished"
  | "sync.meta.finished"
  | "document.ready"
  | "document.error"
  | "analysis.ready";

export type WebhookPayload = {
  event: WebhookEventType;
  tenant_id: string;
  timestamp: string;
  data: Record<string, unknown>;
};

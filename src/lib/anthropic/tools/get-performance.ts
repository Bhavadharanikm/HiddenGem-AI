import { getServiceClient } from "@/lib/supabase/service";

export const getPerformanceTool = {
  name: "get_performance_metrics",
  description:
    "Retrieve internal KPI metrics like occupancy rate, ADR (average daily rate), RevPAR, and total revenue. Use for high-level performance questions and trend analysis.",
  input_schema: {
    type: "object" as const,
    properties: {
      metrics: {
        type: "array",
        items: { type: "string" },
        description:
          "Metric types to retrieve (e.g. occupancy_rate, adr, total_revenue, revpar)",
      },
      date_range: {
        type: "object",
        properties: {
          start: { type: "string" },
          end: { type: "string" },
        },
      },
      group_by: {
        type: "string",
        enum: ["day", "week", "month"],
        description: "Time grouping for the results",
      },
    },
    required: ["metrics"],
  },
};

export async function executeGetPerformance(
  tenantId: string,
  input: {
    metrics: string[];
    date_range?: { start: string; end: string };
    group_by?: "day" | "week" | "month";
  }
) {
  const db = getServiceClient();

  const start =
    input.date_range?.start ??
    new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
  const end =
    input.date_range?.end ?? new Date().toISOString().split("T")[0];

  const { data, error } = await db
    .from("performance_metrics")
    .select("metric_date, metric_type, metric_value, source")
    .eq("tenant_id", tenantId)
    .in("metric_type", input.metrics)
    .gte("metric_date", start)
    .lte("metric_date", end)
    .order("metric_date", { ascending: true });

  if (error) throw new Error(error.message);
  return {
    period: { start, end },
    metrics: data ?? [],
  };
}

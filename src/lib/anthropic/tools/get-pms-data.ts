import { getServiceClient } from "@/lib/supabase/service";

export const getPmsDataTool = {
  name: "query_pms_data",
  description:
    "Query property management data: bookings, revenue, occupancy rates, reviews, and property details. Use for questions about bookings, reservations, check-ins, check-outs, guest counts, revenue, or property performance.",
  input_schema: {
    type: "object" as const,
    properties: {
      data_type: {
        type: "string",
        enum: ["bookings", "revenue_summary", "occupancy", "reviews", "properties"],
        description: "Type of PMS data to retrieve",
      },
      date_range: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", description: "End date (YYYY-MM-DD)" },
        },
      },
      limit: {
        type: "number",
        description: "Max records to return (default 20)",
      },
    },
    required: ["data_type"],
  },
};

export async function executeGetPmsData(
  tenantId: string,
  input: {
    data_type: "bookings" | "revenue_summary" | "occupancy" | "reviews" | "properties";
    date_range?: { start: string; end: string };
    limit?: number;
  }
) {
  const db = getServiceClient();
  const limit = input.limit ?? 20;

  switch (input.data_type) {
    case "bookings": {
      let query = db
        .from("pms_bookings")
        .select(
          "external_id, status, check_in, check_out, guests, total_revenue, platform"
        )
        .eq("tenant_id", tenantId)
        .order("check_in", { ascending: false })
        .limit(limit);

      if (input.date_range) {
        query = query
          .gte("check_in", input.date_range.start)
          .lte("check_out", input.date_range.end);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { bookings: data ?? [] };
    }

    case "revenue_summary": {
      const start = input.date_range?.start ?? new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0];
      const end = input.date_range?.end ?? new Date().toISOString().split("T")[0];

      const { data, error } = await db
        .from("pms_bookings")
        .select("total_revenue, check_in, check_out, platform")
        .eq("tenant_id", tenantId)
        .eq("status", "confirmed")
        .gte("check_in", start)
        .lte("check_out", end);

      if (error) throw new Error(error.message);
      const bookings = data ?? [];
      const totalRevenue = bookings.reduce((s, b) => s + (b.total_revenue ?? 0), 0);
      const byPlatform = bookings.reduce<Record<string, number>>((acc, b) => {
        const p = b.platform ?? "Unknown";
        acc[p] = (acc[p] ?? 0) + (b.total_revenue ?? 0);
        return acc;
      }, {});

      return {
        period: { start, end },
        total_revenue: Math.round(totalRevenue * 100) / 100,
        booking_count: bookings.length,
        by_platform: byPlatform,
      };
    }

    case "occupancy": {
      const { data, error } = await db
        .from("performance_metrics")
        .select("metric_date, metric_type, metric_value")
        .eq("tenant_id", tenantId)
        .in("metric_type", ["occupancy_rate", "adr", "total_revenue"])
        .order("metric_date", { ascending: false })
        .limit(150);

      if (error) throw new Error(error.message);
      return { metrics: data ?? [] };
    }

    case "reviews": {
      const { data, error } = await db
        .from("pms_reviews")
        .select("rating, reviewer_name, review_text, review_date")
        .eq("tenant_id", tenantId)
        .order("review_date", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return { reviews: data ?? [] };
    }

    case "properties": {
      const { data, error } = await db
        .from("pms_properties")
        .select("name, bedrooms, bathrooms, amenities, base_price, currency")
        .eq("tenant_id", tenantId)
        .limit(limit);

      if (error) throw new Error(error.message);
      return { properties: data ?? [] };
    }

    default:
      return { error: "Unknown data_type" };
  }
}

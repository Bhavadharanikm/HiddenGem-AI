import { searchKnowledgeTool, executeSearchKnowledge } from "./search-knowledge";
import { getPmsDataTool, executeGetPmsData } from "./get-pms-data";
import { getMetaAdsTool, executeGetMetaAds } from "./get-meta-ads";
import { getPerformanceTool, executeGetPerformance } from "./get-performance";
import { getAudienceAssetsTool, executeGetAudienceAssets } from "./get-audience-assets";

export const ALL_TOOLS = [
  searchKnowledgeTool,
  getPmsDataTool,
  getMetaAdsTool,
  getPerformanceTool,
  getAudienceAssetsTool,
];

export async function executeTool(
  tenantId: string,
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "search_knowledge_base":
      return executeSearchKnowledge(tenantId, input as Parameters<typeof executeSearchKnowledge>[1]);
    case "query_pms_data":
      return executeGetPmsData(tenantId, input as Parameters<typeof executeGetPmsData>[1]);
    case "query_meta_ads":
      return executeGetMetaAds(tenantId, input as Parameters<typeof executeGetMetaAds>[1]);
    case "get_performance_metrics":
      return executeGetPerformance(tenantId, input as Parameters<typeof executeGetPerformance>[1]);
    case "get_audience_assets":
      return executeGetAudienceAssets(tenantId, input as Parameters<typeof executeGetAudienceAssets>[1]);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

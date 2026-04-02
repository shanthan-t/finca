import { extractHistoryMetadata, insertAIRouterHistoryRow, listAIRouterHistoryRows, searchAIRouterHistoryRows } from "@/lib/persistence-server";
import type { AIHistoryEntry, AIRouterHistoryRow, JsonValue } from "@/lib/types";

function mapHistoryRow(row: AIRouterHistoryRow): AIHistoryEntry {
  const metadata = extractHistoryMetadata(row);

  return {
    turn_id: row.turn_id,
    type: row.intent,
    summary:
      typeof row.api_result_summary === "string" && row.api_result_summary.trim()
        ? row.api_result_summary
        : row.assistant_message,
    user_query: row.user_query,
    batch_id: typeof metadata.batch_id === "string" ? metadata.batch_id : null,
    event_type: typeof metadata.event_type === "string" ? metadata.event_type : null,
    hash: typeof metadata.hash === "string" ? metadata.hash : null
  };
}

function getErrorWarning(prefix: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown server-side history error.";
  return `${prefix}: ${message}`;
}

export async function loadHistoryContext(sessionId: string, limit = 8) {
  try {
    const rows = await listAIRouterHistoryRows(sessionId, limit);
    return {
      items: rows.map(mapHistoryRow),
      warning: null as string | null
    };
  } catch (error) {
    return {
      items: [] as AIHistoryEntry[],
      warning: getErrorWarning("AI history could not be loaded", error)
    };
  }
}

export async function searchHistoryContext(sessionId: string, searchTerm: string, limit = 5) {
  try {
    const rows = await searchAIRouterHistoryRows(sessionId, searchTerm, limit);
    return {
      items: rows.map(mapHistoryRow),
      warning: null as string | null
    };
  } catch (error) {
    return {
      items: [] as AIHistoryEntry[],
      warning: getErrorWarning("AI history search failed", error)
    };
  }
}

export async function logHistoryTurn({
  sessionId,
  userQuery,
  intent,
  assistantMessage,
  apiCall,
  apiResultSummary,
  metadata
}: {
  sessionId: string;
  userQuery: string;
  intent: string;
  assistantMessage: string;
  apiCall?: JsonValue | null;
  apiResultSummary?: string | null;
  metadata?: JsonValue | null;
}) {
  try {
    const row = await insertAIRouterHistoryRow({
      session_id: sessionId,
      user_query: userQuery,
      intent,
      api_call: apiCall ?? null,
      api_result_summary: apiResultSummary ?? null,
      assistant_message: assistantMessage,
      metadata: metadata ?? null
    });

    return {
      turnId: row.turn_id,
      warning: null as string | null
    };
  } catch (error) {
    return {
      turnId: null,
      warning: getErrorWarning("AI history could not be stored", error)
    };
  }
}

import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createSupabaseServerReadClient, createSupabaseServerWriteClient } from "@/lib/supabase-server";
import type {
  AiRouterHistoryEntry,
  AiRouterHistoryInsert,
  AiRouterHistoryRow,
  HistoryContextItem,
  RouterApiCall,
  SupportedIntent
} from "@/lib/types";

const defaultSessionId = "default";

function isMissingHistoryTable(error: PostgrestError) {
  return error.code === "42P01";
}

function summarizeHistoryRow(row: AiRouterHistoryRow): HistoryContextItem {
  const metadata = row.metadata ?? {};
  const summary =
    typeof row.api_result_summary?.summary === "string"
      ? row.api_result_summary.summary
      : typeof row.assistant_message === "string" && row.assistant_message.trim()
        ? row.assistant_message
        : `Intent: ${row.intent}`;

  return {
    turn_id: row.turn_id,
    type: row.intent,
    summary,
    batch_id: typeof metadata.batch_id === "string" ? metadata.batch_id : null,
    event_type: typeof metadata.event_type === "string" ? metadata.event_type : null,
    hash: typeof metadata.hash === "string" ? metadata.hash : null
  };
}

export async function getRecentAiHistory(sessionId?: string, limit = 12): Promise<AiRouterHistoryEntry[]> {
  const supabase = createSupabaseServerReadClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("ai_router_history")
    .select("*")
    .eq("session_id", sessionId ?? defaultSessionId)
    .order("turn_id", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingHistoryTable(error)) {
      return [];
    }

    throw new Error(error.message);
  }

  return ((data ?? []) as AiRouterHistoryRow[]).reverse().map((row) => ({
    turn_id: row.turn_id,
    timestamp: row.created_at,
    user_query: row.user_query,
    intent: row.intent,
    api_call: row.api_call,
    api_result_summary: row.api_result_summary,
    assistant_message: row.assistant_message,
    metadata: row.metadata
  }));
}

export async function getNextTurnId(sessionId?: string) {
  const supabase = createSupabaseServerReadClient();

  if (!supabase) {
    return 1;
  }

  const { data, error } = await supabase
    .from("ai_router_history")
    .select("turn_id")
    .eq("session_id", sessionId ?? defaultSessionId)
    .order("turn_id", { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingHistoryTable(error)) {
      return 1;
    }

    throw new Error(error.message);
  }

  const latestTurn = ((data ?? []) as Array<{ turn_id: number }>)[0] ?? null;

  return (latestTurn?.turn_id ?? 0) + 1;
}

export async function logAiTurn(input: {
  turnId: number;
  sessionId?: string;
  userQuery: string;
  intent: SupportedIntent;
  apiCall: RouterApiCall | null;
  apiResultSummary: Record<string, unknown> | null;
  assistantMessage: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServerWriteClient();

  if (!supabase) {
    return false;
  }

  const payload: AiRouterHistoryInsert = {
    turn_id: input.turnId,
    session_id: input.sessionId ?? defaultSessionId,
    user_query: input.userQuery,
    intent: input.intent,
    api_call: input.apiCall,
    api_result_summary: input.apiResultSummary,
    assistant_message: input.assistantMessage,
    metadata: input.metadata ?? {}
  };

  const { error } = await supabase.from("ai_router_history").insert(payload as never);

  if (error) {
    if (isMissingHistoryTable(error)) {
      return false;
    }

    throw new Error(error.message);
  }

  return true;
}

export function buildHistoryContext(history: AiRouterHistoryEntry[]) {
  return history.map((entry) => {
    const metadata = entry.metadata ?? {};
    const summary =
      entry.api_result_summary && typeof entry.api_result_summary.summary === "string"
        ? entry.api_result_summary.summary
        : typeof entry.assistant_message === "string" && entry.assistant_message.trim()
          ? entry.assistant_message
          : `Intent: ${entry.intent}`;

    return {
      turn_id: entry.turn_id,
      type: entry.intent,
      summary,
      batch_id: typeof metadata.batch_id === "string" ? metadata.batch_id : null,
      event_type: typeof metadata.event_type === "string" ? metadata.event_type : null,
      hash: typeof metadata.hash === "string" ? metadata.hash : null
    };
  });
}

export function buildHistoryContextFromRows(rows: AiRouterHistoryRow[]) {
  return rows.map(summarizeHistoryRow);
}

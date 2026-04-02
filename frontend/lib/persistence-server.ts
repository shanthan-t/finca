import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { deriveBatchFromBlocks, groupBlocksByBatch, mergeBatchSources } from "@/lib/utils";
import { getRequestLanguage } from "@/lib/i18n-server";
import { createTranslator } from "@/lib/i18n";
import type { AIRouterHistoryRow, Batch, BatchSummary, BatchWithBlocks, Block, Database, JsonValue } from "@/lib/types";

function getServerSupabase() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error(
      "Server-side Supabase access is missing. Configure NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return supabase;
}

function formatWriteError(error: PostgrestError, table: "batches" | "blocks" | "ai_router_history") {
  if (error.code === "42P01") {
    return `Supabase is missing ${table}. Run the matching migration first.`;
  }

  if (error.code === "42501") {
    return `Supabase blocked writes to ${table}. Add the required policies or use SUPABASE_SERVICE_ROLE_KEY on the server.`;
  }

  if (error.code === "23503") {
    return `Supabase rejected the write to ${table} because a related row is missing.`;
  }

  return error.message || error.details || error.hint || `Supabase returned an unknown write error for ${table}.`;
}

function formatReadError(error: PostgrestError, table: "batches" | "blocks" | "ai_router_history") {
  if (error.code === "42P01") {
    return `Supabase is missing ${table}. Run the matching migration first.`;
  }

  if (error.code === "42501") {
    return `Supabase blocked reads from ${table}. Add the required policies or use SUPABASE_SERVICE_ROLE_KEY on the server.`;
  }

  return error.message || error.details || error.hint || `Supabase returned an unknown read error for ${table}.`;
}

async function ensureBatchRow(supabase: SupabaseClient<Database>, batch: Batch) {
  const { data: existingBatch, error: lookupError } = await supabase
    .from("batches")
    .select("batch_id")
    .eq("batch_id", batch.batch_id)
    .maybeSingle();

  if (lookupError) {
    console.error(`[DB] Failed to look up batch ${batch.batch_id}:`, lookupError);
    throw new Error(lookupError.message);
  }

  if (existingBatch) {
    console.log(`[DB] Batch ${batch.batch_id} already exists.`);
    return;
  }

  console.log(`[DB] Inserting new batch: ${batch.batch_id}`);
  const { error: insertError } = await supabase.from("batches").insert(batch as never);

  if (insertError && insertError.code !== "23505") {
    console.error(`[DB] Failed to insert batch ${batch.batch_id}:`, insertError);
    throw new Error(formatWriteError(insertError, "batches"));
  }
}

async function ensureBlockRow(supabase: SupabaseClient<Database>, block: Block) {
  const { data: existingBlock, error: lookupError } = await supabase
    .from("blocks")
    .select("batch_id")
    .eq("batch_id", block.batch_id)
    .eq("index", block.index)
    .maybeSingle();

  if (lookupError) {
    console.error(`[DB] Failed to look up block ${block.batch_id}/${block.index}:`, lookupError);
    throw new Error(lookupError.message);
  }

  if (existingBlock) {
    console.log(`[DB] Block ${block.batch_id}/${block.index} already exists.`);
    return;
  }

  console.log(`[DB] Inserting new block: ${block.batch_id}/${block.index}`);
  const { error: insertError } = await supabase.from("blocks").insert(block as never);

  if (insertError && insertError.code !== "23505") {
    console.error(`[DB] Failed to insert block ${block.batch_id}/${block.index}:`, insertError);
    throw new Error(formatWriteError(insertError, "blocks"));
  }
}

function getMetadataRecord(value: JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, JsonValue>;
}

export async function persistBatchAndGenesisServer(batch: Batch, genesisBlock: Block) {
  const supabase = getServerSupabase();

  await ensureBatchRow(supabase, batch);
  await ensureBlockRow(supabase, genesisBlock);
}

export async function persistBlockServer(block: Block) {
  const supabase = getServerSupabase();

  await ensureBlockRow(supabase, block);
}

export async function getBatchRowServer(batchId: string) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("batches").select("*").eq("batch_id", batchId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Batch | null) ?? null;
}

export async function getBlocksByBatchIdServer(batchId: string) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("blocks").select("*").eq("batch_id", batchId).order("index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Block[];
}

export async function getBatchWithBlocksServer(batchId: string): Promise<BatchWithBlocks | null> {
  const language = await getRequestLanguage();
  const t = createTranslator(language);

  const [batch, blocks] = await Promise.all([getBatchRowServer(batchId), getBlocksByBatchIdServer(batchId)]);
  const batchRow = batch ?? deriveBatchFromBlocks(batchId, blocks, t);

  if (!batchRow && blocks.length === 0) {
    return null;
  }

  return {
    ...batchRow!,
    blocks
  };
}

export async function getDashboardSummaryServer() {
  const language = await getRequestLanguage();
  const t = createTranslator(language);

  const supabase = getServerSupabase();
  const [{ data: batches, error: batchError }, { data: blocks, error: blockError }] = await Promise.all([
    supabase.from("batches").select("*").order("crop_name", { ascending: true }),
    supabase.from("blocks").select("*").order("index", { ascending: true })
  ]);

  if (batchError) {
    throw new Error(batchError.message);
  }

  if (blockError) {
    throw new Error(blockError.message);
  }

  const batchRows = mergeBatchSources((batches ?? []) as Batch[], (blocks ?? []) as Block[], t);
  const blockRows = (blocks ?? []) as Block[];
  const blocksByBatch = groupBlocksByBatch(blockRows);

  return batchRows.map((batch) => {
    const chain = blocksByBatch[batch.batch_id] ?? [];
    const lastBlock = chain.at(-1);

    return {
      ...batch,
      block_count: chain.length,
      last_event_type: lastBlock?.event_type ?? null,
      last_timestamp: lastBlock?.timestamp ?? null
    } satisfies BatchSummary;
  });
}

export async function getLatestBlockForBatchServer(batchId: string) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("batch_id", batchId)
    .order("index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Block | null) ?? null;
}

export async function listAIRouterHistoryRows(sessionId: string, limit = 8) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("ai_router_history")
    .select("*")
    .eq("session_id", sessionId)
    .order("turn_id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(formatReadError(error, "ai_router_history"));
  }

  return ((data ?? []) as AIRouterHistoryRow[]).reverse();
}

export async function searchAIRouterHistoryRows(sessionId: string, searchTerm: string, limit = 5) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("ai_router_history")
    .select("*")
    .eq("session_id", sessionId)
    .ilike("user_query", `%${searchTerm}%`)
    .order("turn_id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(formatReadError(error, "ai_router_history"));
  }

  return ((data ?? []) as AIRouterHistoryRow[]).reverse();
}

export async function insertAIRouterHistoryRow(row: Omit<AIRouterHistoryRow, "turn_id">) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("ai_router_history").insert(row as never).select("*").single();

  if (error) {
    throw new Error(formatWriteError(error, "ai_router_history"));
  }

  return data as AIRouterHistoryRow;
}

export function extractHistoryMetadata(row: AIRouterHistoryRow) {
  return getMetadataRecord(row.metadata);
}

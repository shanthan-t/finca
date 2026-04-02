import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase";
import { deriveBatchFromBlocks, groupBlocksByBatch, mergeBatchSources } from "@/lib/utils";
import { getRequestLanguage } from "@/lib/i18n-server";
import { createTranslator } from "@/lib/i18n";
import type { Batch, BatchSummary, BatchWithBlocks, Block } from "@/lib/types";

export async function getDashboardData() {
  noStore();

  const supabase = createSupabaseServerClient();
  const language = await getRequestLanguage();
  const t = createTranslator(language);

  if (!supabase) {
    return [] satisfies BatchSummary[];
  }

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
    };
  });
}

export async function getBatchOptions() {
  noStore();

  const supabase = createSupabaseServerClient();
  const language = await getRequestLanguage();
  const t = createTranslator(language);

  if (!supabase) {
    return [] satisfies Batch[];
  }

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

  return mergeBatchSources((batches ?? []) as Batch[], (blocks ?? []) as Block[], t);
}

export async function getBatchChain(batchId: string): Promise<BatchWithBlocks | null> {
  noStore();

  const supabase = createSupabaseServerClient();
  const language = await getRequestLanguage();
  const t = createTranslator(language);

  if (!supabase) {
    return null;
  }

  const [{ data: batch, error: batchError }, { data: blocks, error: blockError }] = await Promise.all([
    supabase.from("batches").select("*").eq("batch_id", batchId).maybeSingle(),
    supabase.from("blocks").select("*").eq("batch_id", batchId).order("index", { ascending: true })
  ]);

  if (batchError) {
    throw new Error(batchError.message);
  }

  if (blockError) {
    throw new Error(blockError.message);
  }

  const blockRows = (blocks ?? []) as Block[];
  const batchRow = (batch as Batch | null) ?? deriveBatchFromBlocks(batchId, blockRows, t);

  if (!batchRow && blockRows.length === 0) {
    return null;
  }

  return {
    ...batchRow!,
    blocks: blockRows
  };
}

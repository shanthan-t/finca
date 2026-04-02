import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Batch, BatchEnhancements, Block, Database } from "@/lib/types";

function getSupabaseForWrites() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Public data access is missing. Add your public project keys to continue.");
  }

  return supabase;
}

function formatWriteError(error: PostgrestError, table: "batches" | "blocks") {
  if (error.code === "42501") {
    return `Supabase blocked writes to ${table}. Add public INSERT policies because this frontend stores chain records there.`;
  }

  if (error.code === "23503") {
    return "Supabase rejected the block because its batch row is missing.";
  }

  return error.message;
}

async function ensureBatchRow(supabase: SupabaseClient<Database>, batch: Batch) {
  const { data: existingBatch, error: lookupError } = await supabase
    .from("batches")
    .select("batch_id")
    .eq("batch_id", batch.batch_id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existingBatch) {
    return;
  }

  const { error: insertError } = await supabase.from("batches").insert(batch as never);

  if (insertError && insertError.code !== "23505") {
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
    throw new Error(lookupError.message);
  }

  if (existingBlock) {
    return;
  }

  const { error: insertError } = await supabase.from("blocks").insert(block as never);

  if (insertError && insertError.code !== "23505") {
    throw new Error(formatWriteError(insertError, "blocks"));
  }
}

export async function persistBatchAndGenesis(batch: Batch, genesisBlock: Block) {
  const supabase = getSupabaseForWrites();

  await ensureBatchRow(supabase, batch);
  await ensureBlockRow(supabase, genesisBlock);
}

export async function persistBlock(block: Block) {
  const supabase = getSupabaseForWrites();

  await ensureBlockRow(supabase, block);
}

export async function persistBatchEnhancements(batchId: string, enhancements: BatchEnhancements) {
  const supabase = getSupabaseForWrites();
  const payload = Object.fromEntries(
    Object.entries(enhancements).filter(([, value]) => value !== undefined)
  ) as BatchEnhancements;

  if (Object.keys(payload).length === 0) {
    return;
  }

  const { error } = await supabase.from("batches").update(payload as never).eq("batch_id", batchId);

  if (error) {
    throw new Error(formatWriteError(error, "batches"));
  }
}

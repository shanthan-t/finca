import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerWriteClient } from "@/lib/supabase-server";
import type { Batch, Block, Database } from "@/lib/types";

function formatWriteError(error: PostgrestError, table: "batches" | "blocks") {
  if (error.code === "42501") {
    return `Supabase blocked writes to ${table}. Add insert policies or provide SUPABASE_SERVICE_ROLE_KEY for server writes.`;
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

export async function persistBatchAndGenesisServer(batch: Batch, genesisBlock: Block) {
  const supabase = createSupabaseServerWriteClient();

  if (!supabase) {
    throw new Error("Server-side Supabase write access is missing.");
  }

  await ensureBatchRow(supabase, batch);
  await ensureBlockRow(supabase, genesisBlock);
}

export async function persistBlockServer(block: Block) {
  const supabase = createSupabaseServerWriteClient();

  if (!supabase) {
    throw new Error("Server-side Supabase write access is missing.");
  }

  await ensureBlockRow(supabase, block);
}

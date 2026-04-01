import { getSupabaseBrowserClient } from "@/lib/supabase";

const DEFAULT_TIMEOUT_MS = 9000;
const DEFAULT_INTERVAL_MS = 900;

function delay(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export async function waitForBatchVisibility(
  batchId: string,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    intervalMs = DEFAULT_INTERVAL_MS
  }: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {}
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      visible: false,
      reason: "supabase_unavailable" as const
    };
  }

  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const [{ data: batch, error: batchError }, { data: block, error: blockError }] = await Promise.all([
      supabase.from("batches").select("batch_id").eq("batch_id", batchId).maybeSingle(),
      supabase.from("blocks").select("batch_id").eq("batch_id", batchId).limit(1).maybeSingle()
    ]);

    if (batchError) {
      throw new Error(batchError.message);
    }

    if (blockError) {
      throw new Error(blockError.message);
    }

    if (batch || block) {
      return {
        visible: true,
        reason: batch ? ("batch_visible" as const) : ("block_visible" as const)
      };
    }

    if (Date.now() < deadline) {
      await delay(intervalMs);
    }
  }

  return {
    visible: false,
    reason: "timeout" as const
  };
}

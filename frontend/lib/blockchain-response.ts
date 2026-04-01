import type { ApiMutationResponse, Block, ValidationResponse } from "@/lib/types";

export function extractReturnedBlock(response: ApiMutationResponse, fallbackBatchId: string) {
  const directBlock = response.block;

  if (directBlock) {
    return normalizeReturnedBlock(directBlock, fallbackBatchId);
  }

  const nestedData =
    typeof response.data === "object" && response.data !== null && "block" in response.data
      ? response.data.block
      : null;

  return normalizeReturnedBlock(nestedData, fallbackBatchId);
}

export function normalizeValidationResponse(
  response:
    | ValidationResponse
    | {
        result?: ValidationResponse;
        valid?: boolean;
        is_valid?: boolean;
        message?: string;
        invalid_index?: number | null;
        broken_index?: number | null;
      }
): ValidationResponse {
  if ("result" in response && response.result) {
    return response.result;
  }

  const invalidIndex =
    "invalid_index" in response
      ? response.invalid_index ?? null
      : "broken_index" in response
        ? response.broken_index ?? null
        : null;

  return {
    valid: response.valid ?? response.is_valid ?? false,
    message: response.message,
    invalid_index: invalidIndex
  };
}

function normalizeReturnedBlock(candidate: unknown, fallbackBatchId: string): Block | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const block = candidate as Partial<Block> & {
    data?: Block["data"];
  };

  if (
    typeof block.index !== "number" ||
    typeof block.timestamp !== "string" ||
    typeof block.event_type !== "string" ||
    typeof block.previous_hash !== "string" ||
    typeof block.hash !== "string"
  ) {
    return null;
  }

  const batchIdFromData = block.data && typeof block.data.batch_id === "string" ? block.data.batch_id : null;

  return {
    batch_id: typeof block.batch_id === "string" ? block.batch_id : batchIdFromData ?? fallbackBatchId,
    index: block.index,
    timestamp: block.timestamp,
    event_type: block.event_type,
    data: block.data ?? {},
    previous_hash: block.previous_hash,
    hash: block.hash
  };
}

import { configState } from "@/lib/env";
import {
  normalizeTimestampForValidation,
  normalizeValidationResponse
} from "@/lib/blockchain-response";
import type {
  ApiMutationResponse,
  CreateBatchPayload,
  CreateBlockPayload,
  ValidatePayload,
  ValidationResponse
} from "@/lib/types";

export { extractReturnedBlock } from "@/lib/blockchain-response";

const appApiBase = "/api/v1";

class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  if (!configState.hasApi) {
    throw new ApiError("NEXT_PUBLIC_API_URL is missing or invalid. Point it to your FastAPI service before using blockchain actions.");
  }

  const response = await fetch(`${appApiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message);
  }

  if (!data) {
    throw new ApiError("The API returned an empty response.");
  }

  return data;
}

export async function createBatch(payload: CreateBatchPayload) {
  return postJson<ApiMutationResponse>("/batches", payload);
}

export async function createBlock(payload: CreateBlockPayload) {
  return postJson<ApiMutationResponse>("/blocks", payload);
}

export async function validateChain(payload: ValidatePayload): Promise<ValidationResponse> {
  const normalizedBlocks = payload.blocks.map((block) => ({
    ...block,
    timestamp: normalizeTimestampForValidation(block.timestamp)
  }));

  const response = await postJson<
    | ValidationResponse
    | {
        result?: ValidationResponse;
        valid?: boolean;
        is_valid?: boolean;
        message?: string;
        invalid_index?: number | null;
        broken_index?: number | null;
      }
  >(
    "/validate",
    { blocks: normalizedBlocks }
  );

  return normalizeValidationResponse(response);
}

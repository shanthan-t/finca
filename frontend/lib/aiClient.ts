import type { AIQueryRequest, AIResponse } from "@/lib/types";

class AIClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIClientError";
  }
}

export async function sendAIQuery(payload: AIQueryRequest): Promise<AIResponse> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json().catch(() => null)) as AIResponse | { message?: string } | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `The assistant request failed with status ${response.status}.`;

    throw new AIClientError(message);
  }

  if (!data || typeof data !== "object" || typeof (data as AIResponse).assistant_message !== "string") {
    throw new AIClientError("The assistant response was not in the expected format.");
  }

  return data as AIResponse;
}

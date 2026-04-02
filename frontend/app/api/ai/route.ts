import { getAIRouteSchema, runAIRouter } from "@/lib/ai/router";
import type { AIQueryRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getAIRouteSchema(), {
    status: 200
  });
}

export async function POST(request: Request) {
  let payload: AIQueryRequest | null = null;

  try {
    payload = (await request.json()) as AIQueryRequest;
  } catch {
    return Response.json(
      {
        message: "The request body must be valid JSON."
      },
      { status: 400 }
    );
  }

  if (!payload || typeof payload !== "object") {
    return Response.json(
      {
        message: "The request body must be valid JSON."
      },
      { status: 400 }
    );
  }

  try {
    const response = await runAIRouter(payload);

    return Response.json(response, {
      status: 200
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The AI router failed to complete the request.";
    const status =
      message === "The `query` field is required." ||
      message === "The `query` field is too long."
        ? 400
        : 500;

    return Response.json(
      {
        message
      },
      {
        status
      }
    );
  }
}

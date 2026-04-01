import { getNextTurnId, getRecentAiHistory, logAiTurn, buildHistoryContext } from "@/lib/ai/history";
import { executeRouterPlan } from "@/lib/ai/router";
import type { AiTurnRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    route: "/api/ai",
    method: "POST",
    router_version: "2026-04-01.2",
    request_schema: {
      query: "string",
      language: "string?",
      voice_mode: "boolean?",
      session_id: "string?",
      batch_id: "string?",
      response_style: "brief | detailed ?",
      context: {
        batch_id: "string?",
        crop_name: "string?",
        farmer_name: "string?",
        farm_location: "string?",
        event_type: "string?",
        data: "object?"
      }
    }
  });
}

export async function POST(request: Request) {
  let body: AiTurnRequest;

  try {
    body = (await request.json()) as AiTurnRequest;
  } catch {
    return Response.json({ message: "The request body must be valid JSON." }, { status: 400 });
  }

  if (!body.query || typeof body.query !== "string") {
    return Response.json({ message: "The `query` field is required." }, { status: 400 });
  }

  if (body.query.trim().length > 4000) {
    return Response.json({ message: "The `query` field is too long." }, { status: 400 });
  }

  try {
    const sessionId = body.session_id?.trim() || "default";
    const [turnId, history] = await Promise.all([getNextTurnId(sessionId), getRecentAiHistory(sessionId)]);
    const historyContext = buildHistoryContext(history);
    const result = await executeRouterPlan({
      request: body,
      turnId,
      sessionId,
      history: historyContext
    });

    const didPersistHistory = await logAiTurn({
      turnId,
      sessionId,
      userQuery: body.query,
      intent: result.envelope.intent,
      apiCall: result.plan.api_calls[0] ?? null,
      apiResultSummary: result.apiResultSummary,
      assistantMessage: result.envelope.assistant_message,
      metadata: {
        confidence: result.envelope.confidence,
        language: body.language ?? "en",
        voice_mode: Boolean(body.voice_mode),
        batch_id: result.resolved.batchId,
        event_type: result.resolved.eventType,
        hash: typeof result.apiResultSummary?.hash === "string" ? result.apiResultSummary.hash : null,
        valid: typeof result.apiResultSummary?.valid === "boolean" ? result.apiResultSummary.valid : null,
        router_version: result.envelope.router_version
      }
    });

    if (!didPersistHistory) {
      result.envelope.warnings.push(
        "AI router history was not persisted. Apply the ai_router_history migration or configure server-side Supabase access."
      );
    }

    return Response.json(result.envelope);
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "The AI router failed to complete the request."
      },
      { status: 500 }
    );
  }
}

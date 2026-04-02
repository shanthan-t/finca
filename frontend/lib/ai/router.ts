import { createTranslator } from "@/lib/i18n";
import {
  extractReturnedBlock,
  normalizeTimestampForValidation,
  normalizeValidationResponse
} from "@/lib/blockchain-response";
import { loadHistoryContext, logHistoryTurn, searchHistoryContext } from "@/lib/ai/history";
import {
  getBatchWithBlocksServer,
  getBlocksByBatchIdServer,
  getDashboardSummaryServer,
  getLatestBlockForBatchServer,
  persistBatchAndGenesisServer,
  persistBlockServer
} from "@/lib/persistence-server";
import { postBlockchainJson } from "@/lib/server-api";
import {
  formatDateTime,
  getBlockActor,
  getBlockLocation,
  getBlockNarrative,
  toTitleCase
} from "@/lib/utils";
import type {
  AIApiCall,
  AIHistoryEntry,
  AIIntent,
  AIPlannedApiCall,
  AIQueryContext,
  AIQueryRequest,
  AIResponse,
  AIResponseStyle,
  AssistantUIAction,
  BatchWithBlocks,
  BlockData,
  CreateBatchPayload,
  CreateBlockPayload,
  JsonValue,
  ValidationResponse
} from "@/lib/types";

const AI_ROUTER_VERSION = "2026-04-02.1";
const MAX_QUERY_LENGTH = 1600;

const intentList: AIIntent[] = [
  "create_batch",
  "add_block",
  "validate_chain",
  "get_batch_details",
  "get_dashboard_summary",
  "explain_batch",
  "translate_explain",
  "voice_explain",
  "search_history",
  "tamper_check",
  "unknown"
];

const eventAliases = [
  { key: "quality checked", eventType: "quality_checked" },
  { key: "quality check", eventType: "quality_checked" },
  { key: "shelf stocked", eventType: "shelf_stocked" },
  { key: "shelf stock", eventType: "shelf_stocked" },
  { key: "batch created", eventType: "batch_created" },
  { key: "created", eventType: "batch_created" },
  { key: "harvested", eventType: "harvested" },
  { key: "processed", eventType: "processed" },
  { key: "packaged", eventType: "packaged" },
  { key: "stored", eventType: "stored" },
  { key: "shipped", eventType: "shipped" },
  { key: "received", eventType: "received" }
] as const;

interface NormalizedAIRequest {
  query: string;
  queryLower: string;
  language: string;
  voiceMode: boolean;
  sessionId: string;
  batchId: string | null;
  responseStyle: AIResponseStyle;
  context: AIQueryContext;
}

interface IntentDecision {
  intent: AIIntent;
  confidence: number;
}

interface ResolvedBatchContext {
  batchId: string | null;
  historyUsed: AIHistoryEntry[];
}

interface RouterExecutionResult {
  assistantMessage: string;
  intent: AIIntent;
  confidence: number;
  data: Record<string, unknown>;
  uiAction?: AssistantUIAction | null;
  apiCallsMade: AIApiCall[];
  executionResults: Record<string, unknown>;
  historyUsed: AIHistoryEntry[];
  requiresUserAction: boolean;
  followUpQuestion: string | null;
  audioUrl: string | null;
  plannedApiCalls: AIPlannedApiCall[];
  historyMetadata?: Record<string, JsonValue>;
  apiResultSummary?: string | null;
  ttsRequired?: boolean;
}

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function parseRequest(payload: AIQueryRequest): NormalizedAIRequest {
  const query = getText(payload.query);
  const context = getRecord(payload.context) as AIQueryContext;
  const batchId = getText(payload.batch_id) || getText(context.batch_id) || null;
  const responseStyle = payload.response_style ?? "brief";

  return {
    query,
    queryLower: query.toLowerCase(),
    language: getText(payload.language) || "en",
    voiceMode: Boolean(payload.voice_mode),
    sessionId: getText(payload.session_id) || createSessionId(),
    batchId,
    responseStyle,
    context
  };
}

function getSchemaDescription() {
  return {
    route: "/api/ai",
    method: "POST",
    router_version: AI_ROUTER_VERSION,
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
  };
}

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function getBatchIdFromQuery(query: string) {
  const explicitMatch = query.match(/\bbatch(?:\s+id)?\s+([A-Z0-9]+(?:-[A-Z0-9]+)+)\b/i);

  if (explicitMatch?.[1]) {
    return explicitMatch[1].toUpperCase();
  }

  const tokenMatch = query.match(/\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b/);
  return tokenMatch?.[0]?.toUpperCase() ?? null;
}

function getEventTypeFromQuery(queryLower: string) {
  const directAlias = eventAliases.find((alias) => queryLower.includes(alias.key));

  return directAlias?.eventType ?? null;
}

function extractCreateBatchFieldsFromText(text: string) {
  const query = text.trim();

  if (!query) {
    return {
      batch_id: "",
      crop_name: "",
      farmer_name: "",
      farm_location: ""
    };
  }

  const cropFromQuery = query.match(/create\s+(?:a|an|new)?\s*([a-z][a-z\s-]+?)\s+batch/i)?.[1] ?? "";
  const farmerFromQuery = query.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)?.[1] ?? "";
  const locationFromQuery = query.match(/\bin\s+([A-Z][A-Za-z\s,-]+?)(?:\s+with\b|$)/i)?.[1] ?? "";
  const followUpLocationFromQuery =
    query.match(/^([A-Z][A-Za-z\s,-]+?)\s+with\s+batch(?:\s+id)?\s+[A-Z0-9]+(?:-[A-Z0-9]+)+/i)?.[1] ?? "";
  const batchIdFromQuery = getBatchIdFromQuery(query) ?? "";

  return {
    batch_id: batchIdFromQuery,
    crop_name: cropFromQuery ? toTitleCase(cropFromQuery) : "",
    farmer_name: farmerFromQuery,
    farm_location: locationFromQuery || followUpLocationFromQuery
  };
}

function buildMissingFieldQuestion(fields: string[]) {
  if (fields.length === 1) {
    return `I still need ${fields[0]} to complete this request.`;
  }

  return `I still need ${fields.join(", ")} to complete this request.`;
}

function resolveBatchContext(request: NormalizedAIRequest, history: AIHistoryEntry[]): ResolvedBatchContext {
  if (request.batchId) {
    return { batchId: request.batchId, historyUsed: [] };
  }

  const batchIdFromQuery = getBatchIdFromQuery(request.query);

  if (batchIdFromQuery) {
    return { batchId: batchIdFromQuery, historyUsed: [] };
  }

  const historyEntry = [...history].reverse().find((entry) => entry.batch_id);

  if (historyEntry?.batch_id) {
    return {
      batchId: historyEntry.batch_id,
      historyUsed: [historyEntry]
    };
  }

  return {
    batchId: null,
    historyUsed: []
  };
}

function heuristicallyClassifyIntent(request: NormalizedAIRequest) {
  const query = request.queryLower;
  const hasEventContext = Boolean(getText(request.context.event_type) || getRecord(request.context.data) && Object.keys(getRecord(request.context.data)).length > 0);
  const hasCreateContext =
    Boolean(getText(request.context.crop_name)) ||
    Boolean(getText(request.context.farmer_name)) ||
    Boolean(getText(request.context.farm_location));

  if (containsAny(query, ["search history", "history", "last query", "recent query", "what did i ask"])) {
    return { intent: "search_history", confidence: 0.83 } satisfies IntentDecision;
  }

  if (containsAny(query, ["dashboard", "summary", "overview", "how many batches", "all batches"])) {
    return { intent: "get_dashboard_summary", confidence: 0.84 } satisfies IntentDecision;
  }

  if (containsAny(query, ["tamper", "compromised", "broken custody", "integrity compromised"])) {
    return { intent: "tamper_check", confidence: 0.95 } satisfies IntentDecision;
  }

  if (containsAny(query, ["validate", "verify", "integrity check", "is the chain valid", "check the chain"])) {
    return { intent: "validate_chain", confidence: 0.95 } satisfies IntentDecision;
  }

  if (containsAny(query, ["create", "new batch", "register batch", "genesis"]) || hasCreateContext) {
    return { intent: "create_batch", confidence: hasCreateContext ? 0.92 : 0.72 } satisfies IntentDecision;
  }

  if (
    containsAny(query, ["add", "append", "record event", "update batch", "log event"]) ||
    hasEventContext ||
    Boolean(getEventTypeFromQuery(query))
  ) {
    return { intent: "add_block", confidence: hasEventContext ? 0.93 : 0.78 } satisfies IntentDecision;
  }

  if (containsAny(query, ["show batch", "open batch", "batch details", "chain details", "show me the batch"])) {
    return { intent: "get_batch_details", confidence: 0.81 } satisfies IntentDecision;
  }

  if (request.voiceMode && containsAny(query, ["where", "origin", "provenance", "explain", "came from", "journey"])) {
    return { intent: "voice_explain", confidence: 0.86 } satisfies IntentDecision;
  }

  if (request.language !== "en" && containsAny(query, ["where", "origin", "provenance", "came from", "explain"])) {
    return { intent: "translate_explain", confidence: 0.82 } satisfies IntentDecision;
  }

  if (
    request.language !== "en" &&
    request.batchId &&
    request.query.length > 0 &&
    !containsAny(query, ["create", "add", "validate", "verify"])
  ) {
    return { intent: "translate_explain", confidence: 0.72 } satisfies IntentDecision;
  }

  if (containsAny(query, ["where", "origin", "provenance", "came from", "trace", "journey", "explain"])) {
    return { intent: "explain_batch", confidence: 0.82 } satisfies IntentDecision;
  }

  return { intent: "unknown", confidence: 0.34 } satisfies IntentDecision;
}

async function classifyIntentWithGroq(request: NormalizedAIRequest, history: AIHistoryEntry[]) {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.FINCA_AI_MODEL?.trim() || "llama-3.3-70b-versatile";
  const recentHistory = history.slice(-4);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content:
              "You classify Finca agricultural supply-chain requests. Return JSON only with keys intent and confidence. Valid intents: " +
              intentList.join(", ") +
              "."
          },
          {
            role: "user",
            content: JSON.stringify({
              query: request.query,
              language: request.language,
              voice_mode: request.voiceMode,
              batch_id: request.batchId,
              context: request.context,
              history: recentHistory
            })
          }
        ]
      }),
      cache: "no-store"
    });

    const data = (await response.json().catch(() => null)) as
      | {
          choices?: Array<{
            message?: {
              content?: string;
            };
          }>;
        }
      | null;

    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      intent?: string;
      confidence?: number;
    };

    if (!parsed.intent || !intentList.includes(parsed.intent as AIIntent)) {
      return null;
    }

    return {
      intent: parsed.intent as AIIntent,
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.7
    } satisfies IntentDecision;
  } catch {
    return null;
  }
}

async function decideIntent(request: NormalizedAIRequest, history: AIHistoryEntry[]) {
  const heuristic = heuristicallyClassifyIntent(request);

  if (heuristic.confidence >= 0.86 && request.language === "en") {
    return heuristic;
  }

  const groqDecision = await classifyIntentWithGroq(request, history);

  if (groqDecision && groqDecision.confidence >= heuristic.confidence) {
    return groqDecision;
  }

  return heuristic;
}

function getCreateBatchDraft(
  request: NormalizedAIRequest,
  resolvedBatchId: string | null,
  history: AIHistoryEntry[]
) {
  const currentDraft = extractCreateBatchFieldsFromText(request.query);
  const relevantHistory = [...history]
    .reverse()
    .filter((entry) => entry.type === "create_batch" && typeof entry.user_query === "string" && entry.user_query.trim());

  let historyDraft = {
    batch_id: "",
    crop_name: "",
    farmer_name: "",
    farm_location: ""
  };

  for (const entry of relevantHistory) {
    const parsed = extractCreateBatchFieldsFromText(entry.user_query ?? "");

    historyDraft = {
      batch_id: historyDraft.batch_id || parsed.batch_id,
      crop_name: historyDraft.crop_name || parsed.crop_name,
      farmer_name: historyDraft.farmer_name || parsed.farmer_name,
      farm_location: historyDraft.farm_location || parsed.farm_location
    };
  }

  return {
    batch_id:
      resolvedBatchId ??
      (getText(request.context.batch_id) || currentDraft.batch_id || historyDraft.batch_id),
    crop_name: getText(request.context.crop_name) || currentDraft.crop_name || historyDraft.crop_name,
    farmer_name: getText(request.context.farmer_name) || currentDraft.farmer_name || historyDraft.farmer_name,
    farm_location:
      getText(request.context.farm_location) || currentDraft.farm_location || historyDraft.farm_location
  };
}

function getAddBlockDraft(request: NormalizedAIRequest, resolvedBatchId: string | null) {
  const eventType = getText(request.context.event_type) || getEventTypeFromQuery(request.queryLower) || "";
  const data = getRecord(request.context.data);

  return {
    batch_id: resolvedBatchId ?? "",
    event_type: eventType,
    data: data as BlockData
  };
}

function getUiAction(intent: AIIntent, hasAudio: boolean, requiresUserAction: boolean): AssistantUIAction | null {
  if (hasAudio) {
    return "PLAY_AUDIO";
  }

  if (requiresUserAction || intent === "unknown") {
    return "SHOW_ERROR";
  }

  switch (intent) {
    case "create_batch":
    case "add_block":
    case "get_batch_details":
    case "explain_batch":
    case "translate_explain":
    case "voice_explain":
      return "SHOW_BATCH_DETAILS";
    case "validate_chain":
    case "tamper_check":
      return "SHOW_VERIFICATION_RESULT";
    case "get_dashboard_summary":
      return "SHOW_DASHBOARD";
    default:
      return null;
  }
}

function buildFollowUpResult({
  assistantMessage,
  intent,
  confidence,
  followUpQuestion,
  historyUsed,
  plannedApiCalls
}: {
  assistantMessage: string;
  intent: AIIntent;
  confidence: number;
  followUpQuestion: string;
  historyUsed: AIHistoryEntry[];
  plannedApiCalls: AIPlannedApiCall[];
}): RouterExecutionResult {
  return {
    assistantMessage,
    intent,
    confidence,
    data: {},
    uiAction: "SHOW_ERROR",
    apiCallsMade: [],
    executionResults: {},
    historyUsed,
    requiresUserAction: true,
    followUpQuestion,
    audioUrl: null,
    plannedApiCalls,
    apiResultSummary: followUpQuestion,
    ttsRequired: false
  };
}

function buildValidationMessage(validation: ValidationResponse) {
  if (validation.valid) {
    return "The chain is valid and no broken index was reported.";
  }

  if (typeof validation.invalid_index === "number") {
    return `Integrity compromised. The chain failed at block ${validation.invalid_index}.`;
  }

  return validation.message || "Integrity compromised. The validator reported a broken custody path.";
}

function buildBatchExplanation(batch: BatchWithBlocks, style: AIResponseStyle) {
  const genesis = batch.blocks.find((block) => block.index === 0) ?? batch.blocks[0] ?? null;
  const latest = batch.blocks.at(-1) ?? null;
  const intro = `Batch ${batch.batch_id} is ${batch.crop_name} from ${batch.farmer_name} in ${batch.farm_location}.`;

  if (!latest || !genesis) {
    return `${intro} The origin record exists, but the chain details are still minimal.`;
  }

  // AI construction usually stays in English as it's translated later by maybeTranslateMessage
  const t = createTranslator("en");
  const latestActor = getBlockActor(latest, batch, t);
  const latestLocation = getBlockLocation(latest, batch, t);
  const latestNarrative = getBlockNarrative(latest, t);
  const summary = `${intro} The chain currently contains ${batch.blocks.length} block${batch.blocks.length === 1 ? "" : "s"}. The latest event is ${toTitleCase(latest.event_type)} by ${latestActor} in ${latestLocation}.`;

  if (style !== "detailed") {
    return summary;
  }

  return `${summary} It started on ${formatDateTime(genesis.timestamp, "en", t)} and the most recent record was logged on ${formatDateTime(latest.timestamp, "en", t)}. Latest note: ${latestNarrative}.`;
}

function buildDashboardMessage(
  summaries: Awaited<ReturnType<typeof getDashboardSummaryServer>>,
  style: AIResponseStyle
) {
  const totalBlocks = summaries.reduce((total, batch) => total + batch.block_count, 0);

  if (summaries.length === 0) {
    return "No batches are stored yet. Create the first batch to begin the trusted chain history.";
  }

  const latestBatch = [...summaries]
    .sort((left, right) => (right.last_timestamp ?? "").localeCompare(left.last_timestamp ?? ""))
    .at(0);

  const intro = `${summaries.length} batch${summaries.length === 1 ? "" : "es"} are currently tracked with ${totalBlocks} total recorded block${totalBlocks === 1 ? "" : "s"}.`;

  if (style !== "detailed" || !latestBatch) {
    return intro;
  }

  const t = createTranslator("en");
  return `${intro} The most recent activity is on batch ${latestBatch.batch_id}, where the latest event is ${toTitleCase(latestBatch.last_event_type ?? "origin record")} at ${latestBatch.last_timestamp ? formatDateTime(latestBatch.last_timestamp, "en", t) : "an unconfirmed time"}.`;
}

async function maybeTranslateMessage(message: string, request: NormalizedAIRequest, warnings: string[]) {
  if (request.language === "en") {
    return message;
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    warnings.push(`GROQ_API_KEY is missing, so the assistant returned an English fallback instead of ${request.language}.`);
    return message;
  }

  const model = process.env.FINCA_AI_MODEL?.trim() || "llama-3.3-70b-versatile";

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              `Translate the following Finca assistant message into ${request.language}. Preserve batch IDs, hashes, event types, and factual meaning. Return only translated text.`
          },
          {
            role: "user",
            content: message
          }
        ]
      }),
      cache: "no-store"
    });

    const data = (await response.json().catch(() => null)) as
      | {
          choices?: Array<{
            message?: {
              content?: string;
            };
          }>;
        }
      | null;

    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      warnings.push(`Groq returned an empty translation for language ${request.language}.`);
      return message;
    }

    return content;
  } catch {
    warnings.push(`Groq translation failed for language ${request.language}, so the assistant returned an English fallback.`);
    return message;
  }
}

async function handleCreateBatch(
  request: NormalizedAIRequest,
  decision: IntentDecision,
  resolvedBatch: ResolvedBatchContext,
  history: AIHistoryEntry[]
): Promise<RouterExecutionResult> {
  const draft = getCreateBatchDraft(request, resolvedBatch.batchId, history);
  const missingFields = Object.entries(draft)
    .filter(([, value]) => !value)
    .map(([key]) => key.replace(/_/g, " "));

  const plannedApiCalls: AIPlannedApiCall[] = [
    {
      service: "python_blockchain",
      endpoint: "/batches",
      method: "POST",
      payload: draft
    }
  ];

  if (missingFields.length > 0) {
    const question = buildMissingFieldQuestion(missingFields);

    return buildFollowUpResult({
      assistantMessage: question,
      intent: "create_batch",
      confidence: decision.confidence,
      followUpQuestion: question,
      historyUsed: resolvedBatch.historyUsed,
      plannedApiCalls
    });
  }

  const response = await postBlockchainJson("/batches", draft as CreateBatchPayload);
  const block = extractReturnedBlock(response as Record<string, unknown>, draft.batch_id);

  if (!block) {
    throw new Error("The blockchain backend did not return a usable genesis block.");
  }

  await persistBatchAndGenesisServer(
    {
      ...draft,
      created_at: block.timestamp
    },
    block
  );

  const assistantMessage =
    typeof (response as { message?: string }).message === "string" && (response as { message?: string }).message?.trim()
      ? ((response as { message?: string }).message as string)
      : `Created batch ${draft.batch_id} and issued genesis block ${block.index}.`;

  return {
    assistantMessage,
    intent: "create_batch",
    confidence: decision.confidence,
    data: {
      batch_id: draft.batch_id,
      block_index: block.index,
      hash: block.hash
    },
    uiAction: "SHOW_BATCH_DETAILS",
    apiCallsMade: [
      { endpoint: "/batches", method: "POST", service: "python_blockchain", ok: true },
      { endpoint: "/batches,blocks", method: "POST", service: "supabase", ok: true }
    ],
    executionResults: {
      "/batches": {
        success: true,
        block_index: block.index
      }
    },
    historyUsed: resolvedBatch.historyUsed,
    requiresUserAction: false,
    followUpQuestion: null,
    audioUrl: null,
    plannedApiCalls,
    historyMetadata: {
      batch_id: draft.batch_id,
      event_type: block.event_type,
      hash: block.hash
    },
    apiResultSummary: `Batch ${draft.batch_id} was created and its genesis block was issued as block ${block.index}.`,
    ttsRequired: false
  };
}

async function handleAddBlock(
  request: NormalizedAIRequest,
  decision: IntentDecision,
  resolvedBatch: ResolvedBatchContext
): Promise<RouterExecutionResult> {
  const draft = getAddBlockDraft(request, resolvedBatch.batchId);
  const plannedApiCalls: AIPlannedApiCall[] = [];
  const missingFields: string[] = [];

  if (!draft.batch_id) {
    missingFields.push("batch id");
  }

  if (!draft.event_type) {
    missingFields.push("event type");
  }

  if (missingFields.length > 0) {
    const question = buildMissingFieldQuestion(missingFields);

    return buildFollowUpResult({
      assistantMessage: question,
      intent: "add_block",
      confidence: decision.confidence,
      followUpQuestion: question,
      historyUsed: resolvedBatch.historyUsed,
      plannedApiCalls
    });
  }

  const lastBlock = await getLatestBlockForBatchServer(draft.batch_id);

  if (!lastBlock) {
    return buildFollowUpResult({
      assistantMessage: `No genesis block is stored for batch ${draft.batch_id} yet.`,
      intent: "add_block",
      confidence: decision.confidence,
      followUpQuestion: `Create batch ${draft.batch_id} first, then I can add the new event.`,
      historyUsed: resolvedBatch.historyUsed,
      plannedApiCalls
    });
  }

  const payload: CreateBlockPayload = {
    batch_id: draft.batch_id,
    event_type: draft.event_type,
    data: draft.data,
    previous_hash: lastBlock.hash,
    index: lastBlock.index + 1
  };

  plannedApiCalls.push({
    service: "python_blockchain",
    endpoint: "/blocks",
    method: "POST",
    payload: payload as unknown as Record<string, unknown>
  });

  const response = await postBlockchainJson("/blocks", payload);
  const block = extractReturnedBlock(response as Record<string, unknown>, draft.batch_id);

  if (!block) {
    throw new Error("The blockchain backend did not return a usable block.");
  }

  await persistBlockServer(block);

  const assistantMessage =
    typeof (response as { message?: string }).message === "string" && (response as { message?: string }).message?.trim()
      ? ((response as { message?: string }).message as string)
      : `Added ${toTitleCase(block.event_type)} to batch ${draft.batch_id} as block ${block.index}.`;

  return {
    assistantMessage,
    intent: "add_block",
    confidence: decision.confidence,
    data: {
      batch_id: draft.batch_id,
      block_index: block.index,
      event_type: block.event_type,
      hash: block.hash
    },
    uiAction: "SHOW_BATCH_DETAILS",
    apiCallsMade: [
      { endpoint: "/blocks", method: "POST", service: "python_blockchain", ok: true },
      { endpoint: "/blocks", method: "POST", service: "supabase", ok: true }
    ],
    executionResults: {
      "/blocks": {
        success: true,
        block_index: block.index
      }
    },
    historyUsed: resolvedBatch.historyUsed,
    requiresUserAction: false,
    followUpQuestion: null,
    audioUrl: null,
    plannedApiCalls,
    historyMetadata: {
      batch_id: draft.batch_id,
      event_type: block.event_type,
      hash: block.hash
    },
    apiResultSummary: `Added ${toTitleCase(block.event_type)} to batch ${draft.batch_id} as block ${block.index}.`,
    ttsRequired: false
  };
}

async function handleValidationIntent(
  request: NormalizedAIRequest,
  decision: IntentDecision,
  resolvedBatch: ResolvedBatchContext,
  intent: "validate_chain" | "tamper_check"
): Promise<RouterExecutionResult> {
  if (!resolvedBatch.batchId) {
    const question = "Which batch ID should I validate?";

    return buildFollowUpResult({
      assistantMessage: question,
      intent,
      confidence: decision.confidence,
      followUpQuestion: question,
      historyUsed: resolvedBatch.historyUsed,
      plannedApiCalls: []
    });
  }

  const blocks = await getBlocksByBatchIdServer(resolvedBatch.batchId);

  if (blocks.length === 0) {
    return buildFollowUpResult({
      assistantMessage: `No blocks are stored for batch ${resolvedBatch.batchId}.`,
      intent,
      confidence: decision.confidence,
      followUpQuestion: `I need a stored chain for batch ${resolvedBatch.batchId} before I can validate it.`,
      historyUsed: resolvedBatch.historyUsed,
      plannedApiCalls: []
    });
  }

  const validationPayload = {
    blocks: blocks.map((block) => ({
      ...block,
      timestamp: normalizeTimestampForValidation(block.timestamp)
    }))
  };

  const plannedApiCalls: AIPlannedApiCall[] = [
    {
      service: "python_blockchain",
      endpoint: "/validate",
      method: "POST",
      payload: validationPayload
    }
  ];

  const rawValidation = await postBlockchainJson("/validate", validationPayload);
  const validation = normalizeValidationResponse(rawValidation as Record<string, unknown>);
  const latest = blocks.at(-1) ?? null;
  const assistantMessage = buildValidationMessage(validation);

  return {
    assistantMessage,
    intent,
    confidence: decision.confidence,
    data: {
      batch_id: resolvedBatch.batchId,
      valid: validation.valid,
      invalid_index: validation.invalid_index ?? null,
      details: validation.details ?? null
    },
    uiAction: "SHOW_VERIFICATION_RESULT",
    apiCallsMade: [{ endpoint: "/validate", method: "POST", service: "python_blockchain", ok: true }],
    executionResults: {
      "/validate": {
        valid: validation.valid,
        invalid_index: validation.invalid_index ?? null
      }
    },
    historyUsed: resolvedBatch.historyUsed,
    requiresUserAction: false,
    followUpQuestion: null,
    audioUrl: null,
    plannedApiCalls,
    historyMetadata: {
      batch_id: resolvedBatch.batchId,
      event_type: latest?.event_type ?? null,
      hash: latest?.hash ?? null
    },
    apiResultSummary: assistantMessage,
    ttsRequired: false
  };
}

async function handleBatchReadIntent(
  request: NormalizedAIRequest,
  decision: IntentDecision,
  resolvedBatch: ResolvedBatchContext,
  intent: "get_batch_details" | "explain_batch" | "translate_explain" | "voice_explain",
  warnings: string[]
): Promise<RouterExecutionResult> {
  if (!resolvedBatch.batchId) {
    const question = "Which batch ID should I explain?";

    return buildFollowUpResult({
      assistantMessage: question,
      intent,
      confidence: decision.confidence,
      followUpQuestion: question,
      historyUsed: resolvedBatch.historyUsed,
      plannedApiCalls: []
    });
  }

  const batch = await getBatchWithBlocksServer(resolvedBatch.batchId);

  if (!batch) {
    return buildFollowUpResult({
      assistantMessage: `I could not find batch ${resolvedBatch.batchId}.`,
      intent,
      confidence: decision.confidence,
      followUpQuestion: `Check the batch ID for ${resolvedBatch.batchId} and try again.`,
      historyUsed: resolvedBatch.historyUsed,
      plannedApiCalls: []
    });
  }

  let assistantMessage = buildBatchExplanation(batch, request.responseStyle);
  assistantMessage = await maybeTranslateMessage(assistantMessage, request, warnings);

  if (intent === "voice_explain" || request.voiceMode) {
    warnings.push("TTS is not configured yet, so audio_url is null even though voice mode was requested.");
  }

  const latest = batch.blocks.at(-1) ?? null;

  return {
    assistantMessage,
    intent,
    confidence: decision.confidence,
    data: {
      batch_id: batch.batch_id,
      block_count: batch.blocks.length,
      latest_event_type: latest?.event_type ?? null
    },
    uiAction: "SHOW_BATCH_DETAILS",
    apiCallsMade: [{ endpoint: `/batches/${batch.batch_id}`, method: "GET", service: "supabase", ok: true }],
    executionResults: {
      batch: {
        batch_id: batch.batch_id,
        block_count: batch.blocks.length,
        latest_hash: latest?.hash ?? null
      }
    },
    historyUsed: resolvedBatch.historyUsed,
    requiresUserAction: false,
    followUpQuestion: null,
    audioUrl: null,
    plannedApiCalls: [
      {
        service: "supabase",
        endpoint: `/batches/${batch.batch_id}`,
        method: "GET"
      }
    ],
    historyMetadata: {
      batch_id: batch.batch_id,
      event_type: latest?.event_type ?? null,
      hash: latest?.hash ?? null
    },
    apiResultSummary: `Explained batch ${batch.batch_id} with ${batch.blocks.length} recorded block${batch.blocks.length === 1 ? "" : "s"}.`,
    ttsRequired: intent === "voice_explain" || request.voiceMode
  };
}

async function handleDashboardIntent(
  request: NormalizedAIRequest,
  decision: IntentDecision
): Promise<RouterExecutionResult> {
  const summaries = await getDashboardSummaryServer();
  const assistantMessage = buildDashboardMessage(summaries, request.responseStyle);

  return {
    assistantMessage,
    intent: "get_dashboard_summary",
    confidence: decision.confidence,
    data: {
      batch_count: summaries.length,
      total_blocks: summaries.reduce((total, batch) => total + batch.block_count, 0),
      batches: summaries.slice(0, 5).map((batch) => ({
        batch_id: batch.batch_id,
        crop_name: batch.crop_name,
        block_count: batch.block_count
      }))
    },
    uiAction: "SHOW_DASHBOARD",
    apiCallsMade: [{ endpoint: "/dashboard", method: "GET", service: "supabase", ok: true }],
    executionResults: {
      dashboard: {
        batch_count: summaries.length
      }
    },
    historyUsed: [],
    requiresUserAction: false,
    followUpQuestion: null,
    audioUrl: null,
    plannedApiCalls: [
      {
        service: "supabase",
        endpoint: "/dashboard",
        method: "GET"
      }
    ],
    apiResultSummary: assistantMessage,
    ttsRequired: false
  };
}

async function handleSearchHistoryIntent(
  request: NormalizedAIRequest,
  decision: IntentDecision,
  warnings: string[]
): Promise<RouterExecutionResult> {
  const searchTerm = request.query
    .replace(/search history|history|what did i ask|recent query|last query/gi, "")
    .trim();

  const result = searchTerm
    ? await searchHistoryContext(request.sessionId, searchTerm, 5)
    : await loadHistoryContext(request.sessionId, 5);

  if (result.warning) {
    warnings.push(result.warning);
  }

  const historyItems = result.items;

  if (historyItems.length === 0) {
    return {
      assistantMessage: "No matching AI history was found for this session yet.",
      intent: "search_history",
      confidence: decision.confidence,
      data: {
        results: []
      },
      uiAction: null,
      apiCallsMade: [],
      executionResults: {
        history_matches: 0
      },
      historyUsed: [],
      requiresUserAction: false,
      followUpQuestion: null,
      audioUrl: null,
      plannedApiCalls: [
        {
          service: "supabase",
          endpoint: "/ai_router_history",
          method: "GET"
        }
      ],
      apiResultSummary: "No matching AI history was found.",
      ttsRequired: false
    };
  }

  const assistantMessage = `I found ${historyItems.length} matching history item${historyItems.length === 1 ? "" : "s"}. Most recent: ${historyItems.at(-1)?.summary ?? "No summary available"}`;

  return {
    assistantMessage,
    intent: "search_history",
    confidence: decision.confidence,
    data: {
      results: historyItems
    },
    uiAction: null,
    apiCallsMade: [{ endpoint: "/ai_router_history", method: "GET", service: "supabase", ok: true }],
    executionResults: {
      history_matches: historyItems.length
    },
    historyUsed: historyItems,
    requiresUserAction: false,
    followUpQuestion: null,
    audioUrl: null,
    plannedApiCalls: [
      {
        service: "supabase",
        endpoint: "/ai_router_history",
        method: "GET"
      }
    ],
    apiResultSummary: assistantMessage,
    ttsRequired: false
  };
}

function handleUnknownIntent(request: NormalizedAIRequest, decision: IntentDecision): RouterExecutionResult {
  const followUpQuestion =
    "I can create a batch, add an event, validate a chain, explain a batch, or show a dashboard summary. What should I do?";

  return {
    assistantMessage: followUpQuestion,
    intent: "unknown",
    confidence: decision.confidence,
    data: {},
    uiAction: "SHOW_ERROR",
    apiCallsMade: [],
    executionResults: {},
    historyUsed: [],
    requiresUserAction: true,
    followUpQuestion,
    audioUrl: null,
    plannedApiCalls: [],
    apiResultSummary: followUpQuestion,
    ttsRequired: false
  };
}

async function executeIntent(
  request: NormalizedAIRequest,
  decision: IntentDecision,
  history: AIHistoryEntry[],
  warnings: string[]
) {
  const resolvedBatch = resolveBatchContext(request, history);
  const combinedHistoryUsed = resolvedBatch.historyUsed;

  switch (decision.intent) {
    case "create_batch":
      return handleCreateBatch(request, decision, resolvedBatch, history);
    case "add_block":
      return handleAddBlock(request, decision, resolvedBatch);
    case "validate_chain":
      return handleValidationIntent(request, decision, resolvedBatch, "validate_chain");
    case "tamper_check":
      return handleValidationIntent(request, decision, resolvedBatch, "tamper_check");
    case "get_batch_details":
      return handleBatchReadIntent(request, decision, resolvedBatch, "get_batch_details", warnings);
    case "translate_explain":
      return handleBatchReadIntent(request, decision, resolvedBatch, "translate_explain", warnings);
    case "voice_explain":
      return handleBatchReadIntent(request, decision, resolvedBatch, "voice_explain", warnings);
    case "explain_batch":
      return handleBatchReadIntent(request, decision, resolvedBatch, "explain_batch", warnings);
    case "get_dashboard_summary":
      return handleDashboardIntent(request, decision);
    case "search_history":
      return handleSearchHistoryIntent(request, decision, warnings);
    default: {
      const unknown = handleUnknownIntent(request, decision);

      return {
        ...unknown,
        historyUsed: combinedHistoryUsed
      };
    }
  }
}

function createHistoryMetadata(result: RouterExecutionResult) {
  return {
    ...(result.historyMetadata ?? {}),
    ui_action: result.uiAction ?? null,
    requires_user_action: result.requiresUserAction,
    audio_url: result.audioUrl
  } satisfies Record<string, JsonValue>;
}

export function getAIRouterVersion() {
  return AI_ROUTER_VERSION;
}

export function getAIRouteSchema() {
  return getSchemaDescription();
}

export async function runAIRouter(payload: AIQueryRequest): Promise<AIResponse> {
  const request = parseRequest(payload);

  if (!request.query) {
    throw new Error("The `query` field is required.");
  }

  if (request.query.length > MAX_QUERY_LENGTH) {
    throw new Error("The `query` field is too long.");
  }

  const warnings: string[] = [];
  const historyContext = await loadHistoryContext(request.sessionId, 8);

  if (historyContext.warning) {
    warnings.push(historyContext.warning);
  }

  const decision = await decideIntent(request, historyContext.items);
  const execution = await executeIntent(request, decision, historyContext.items, warnings);
  const uiAction =
    execution.uiAction ?? getUiAction(execution.intent, Boolean(execution.audioUrl), execution.requiresUserAction);

  const routerPlan = {
    intent: execution.intent,
    confidence: execution.confidence,
    requires_api_call: execution.plannedApiCalls.length > 0,
    api_calls: execution.plannedApiCalls,
    history_context_used: execution.historyUsed,
    response_style: request.responseStyle,
    tts_required: Boolean(execution.ttsRequired),
    follow_up_needed: execution.requiresUserAction,
    follow_up_question: execution.followUpQuestion
  };

  const historyLog = await logHistoryTurn({
    sessionId: request.sessionId,
    userQuery: request.query,
    intent: execution.intent,
    assistantMessage: execution.assistantMessage,
    apiCall: execution.plannedApiCalls as unknown as JsonValue,
    apiResultSummary: execution.apiResultSummary ?? execution.assistantMessage,
    metadata: createHistoryMetadata({
      ...execution,
      uiAction
    })
  });

  if (historyLog.warning) {
    warnings.push(historyLog.warning);
  }

  return {
    assistant_message: execution.assistantMessage,
    intent: execution.intent,
    confidence: execution.confidence,
    ui_action: uiAction,
    data: execution.data,
    router_plan: routerPlan,
    api_calls_made: execution.apiCallsMade,
    history_used: execution.historyUsed,
    execution_results: execution.executionResults,
    audio_url: execution.audioUrl,
    requires_user_action: execution.requiresUserAction,
    follow_up_question: execution.followUpQuestion,
    session_id: request.sessionId,
    turn_id: historyLog.turnId ?? undefined,
    router_version: AI_ROUTER_VERSION,
    warnings
  };
}

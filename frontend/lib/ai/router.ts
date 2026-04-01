import { extractReturnedBlock, normalizeValidationResponse } from "@/lib/blockchain-response";
import { getBatchChain, getDashboardData } from "@/lib/data";
import { persistBatchAndGenesisServer, persistBlockServer } from "@/lib/persistence-server";
import { getServerApiUrl } from "@/lib/server-api";
import { toTitleCase } from "@/lib/utils";
import type {
  AiResponseEnvelope,
  AiTurnRequest,
  ApiMutationResponse,
  BatchSummary,
  BatchWithBlocks,
  BlockData,
  CreateBatchPayload,
  CreateBlockPayload,
  HistoryContextItem,
  RouterApiCall,
  RouterPlan,
  SupportedIntent,
  ValidationResponse
} from "@/lib/types";

const defaultLanguage = "en";
const defaultModel = process.env.FINCA_AI_MODEL ?? "llama-3.3-70b-versatile";
const routerVersion = "2026-04-01.2";
const tamilScriptPattern = /\p{Script=Tamil}/u;

interface ResolvedContext {
  batchId: string | null;
  batchMetadata: Partial<CreateBatchPayload>;
  eventType: string | null;
  eventData: BlockData;
  language: string;
  voiceMode: boolean;
  responseStyle: "brief" | "detailed";
}

interface BuildRouterResult {
  plan: RouterPlan;
  currentBatch: BatchWithBlocks | null;
  resolved: ResolvedContext;
}

interface ExecutionContext {
  plan: RouterPlan;
  currentBatch: BatchWithBlocks | null;
  resolved: ResolvedContext;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function sanitizeExtractedValue(value: string | null) {
  return value?.trim().replace(/^["']|["']$/g, "").replace(/[.]+$/, "") || null;
}

function hasAnyPhrase(query: string, phrases: string[]) {
  const normalized = normalizeText(query);
  return phrases.some((phrase) => normalized.includes(phrase));
}

function inferLanguage(query: string, explicitLanguage?: string) {
  if (explicitLanguage?.trim()) {
    return explicitLanguage.trim().toLowerCase();
  }

  if (tamilScriptPattern.test(query)) {
    return "ta";
  }

  return defaultLanguage;
}

function extractBatchId(query: string) {
  const explicitMatch = query.match(/\b(?:batch(?:\s+id)?|id)\s*[:=-]?\s*([A-Z]{2,}(?:-[A-Z0-9]+)+)\b/i);

  if (explicitMatch?.[1]) {
    return explicitMatch[1];
  }

  const fallbackMatch = query.match(/\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b/);
  return fallbackMatch?.[0] ?? null;
}

function extractLabelledValue(query: string, labels: string[]) {
  const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const labelGroup = escapedLabels.join("|");
  const patterns = [
    new RegExp(`(?:${labelGroup})\\s*[:=-]\\s*([^,\\n]+)`, "i"),
    new RegExp(`(?:${labelGroup})\\s+is\\s+([^,\\n]+)`, "i")
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);

    if (match?.[1]) {
      return sanitizeExtractedValue(match[1]);
    }
  }

  return null;
}

function inferCropFromCreateQuery(query: string) {
  const match = query.match(/\b(?:create|register|start|open|new)\s+(?:a|an)?\s*([a-z][a-z\s]+?)\s+batch\b/i);
  return sanitizeExtractedValue(match?.[1] ?? null);
}

function inferBatchMetadata(query: string, context?: AiTurnRequest["context"]): Partial<CreateBatchPayload> {
  const batchId = context?.batch_id ?? extractBatchId(query);
  const cropName = context?.crop_name ?? extractLabelledValue(query, ["crop", "crop name", "product", "crop_name"]) ?? inferCropFromCreateQuery(query);
  const farmerName =
    context?.farmer_name ?? extractLabelledValue(query, ["farmer", "farmer name", "producer", "farmer_name"]);
  const farmLocation =
    context?.farm_location ??
    extractLabelledValue(query, ["farm location", "location", "origin", "farm_location", "source"]);

  return {
    ...(batchId ? { batch_id: batchId } : {}),
    ...(cropName ? { crop_name: cropName } : {}),
    ...(farmerName ? { farmer_name: farmerName } : {}),
    ...(farmLocation ? { farm_location: farmLocation } : {})
  };
}

function inferEventType(query: string, explicitEventType?: string) {
  if (explicitEventType?.trim()) {
    return explicitEventType.trim().toLowerCase().replace(/\s+/g, "_");
  }

  const normalized = normalizeText(query);
  const eventMap: Array<[string, string]> = [
    ["transport", "shipped"],
    ["ship", "shipped"],
    ["shipment", "shipped"],
    ["harvest", "harvested"],
    ["process", "processed"],
    ["quality", "quality_checked"],
    ["package", "packaged"],
    ["store", "stored"],
    ["receive", "received"],
    ["shelf", "shelf_stocked"]
  ];

  return eventMap.find(([keyword]) => normalized.includes(keyword))?.[1] ?? null;
}

function inferEventData(query: string, initialData?: BlockData): BlockData {
  const labelledMappings: Array<[string, string[]]> = [
    ["actor", ["actor", "handled by", "carrier actor"]],
    ["location", ["location", "place"]],
    ["status", ["status"]],
    ["note", ["note", "summary", "description"]],
    ["destination", ["destination"]],
    ["warehouse", ["warehouse"]],
    ["carrier", ["carrier"]],
    ["shipment_id", ["shipment id", "shipment_id"]],
    ["vehicle_id", ["vehicle id", "vehicle_id"]],
    ["temperature", ["temperature"]],
    ["condition", ["condition"]],
    ["market", ["market"]],
    ["certification", ["certification"]]
  ];

  const merged: BlockData = {
    ...(initialData ?? {})
  };

  for (const [key, labels] of labelledMappings) {
    const value = extractLabelledValue(query, labels);

    if (value) {
      merged[key] = value;
    }
  }

  return merged;
}

function inferResponseStyle(query: string, explicitStyle?: "brief" | "detailed") {
  if (explicitStyle) {
    return explicitStyle;
  }

  if (hasAnyPhrase(query, ["detail", "detailed", "full timeline", "full details", "explain fully"])) {
    return "detailed";
  }

  return "brief";
}

function shouldResolveRelativeBatch(query: string) {
  return hasAnyPhrase(query, [
    "verify it",
    "validate it",
    "check it",
    "explain it",
    "this batch",
    "this chain",
    "the last batch",
    "the last one",
    "latest batch",
    "latest chain",
    "last batch",
    "last chain",
    "this one"
  ]);
}

function detectIntentHeuristically(query: string, options: { voiceMode: boolean; language: string }): SupportedIntent {
  const normalized = normalizeText(query);

  if (
    options.voiceMode ||
    normalized.includes("voice") ||
    normalized.includes("audio") ||
    normalized.includes("speak") ||
    normalized.includes("read this out") ||
    normalized.includes("குரல்")
  ) {
    return "voice_explain";
  }

  if (
    normalized.includes("dashboard") ||
    normalized.includes("summary") ||
    normalized.includes("overview") ||
    normalized.includes("சுருக்கம்")
  ) {
    return "get_dashboard_summary";
  }

  if (
    normalized.includes("history") ||
    normalized.includes("search history") ||
    normalized.includes("what did we do") ||
    normalized.includes("வரலாறு")
  ) {
    return "search_history";
  }

  if (
    normalized.includes("tamper") ||
    normalized.includes("tampered") ||
    normalized.includes("integrity issue")
  ) {
    return "tamper_check";
  }

  if (normalized.includes("validate") || normalized.includes("verify") || normalized.includes("சரிபார்") || normalized.includes("சரிபார்க்க")) {
    return "validate_chain";
  }

  if (
    normalized.includes("create") ||
    normalized.includes("new batch") ||
    normalized.includes("register batch") ||
    normalized.includes("genesis") ||
    normalized.includes("உருவாக்க")
  ) {
    return "create_batch";
  }

  if (
    normalized.includes("add") ||
    normalized.includes("append") ||
    normalized.includes("record event") ||
    normalized.includes("log event") ||
    normalized.includes("சேர்க்க")
  ) {
    return "add_block";
  }

  if (
    normalized.includes("details") ||
    normalized.includes("show batch") ||
    normalized.includes("batch details") ||
    normalized.includes("inspect batch")
  ) {
    return "get_batch_details";
  }

  if (
    normalized.includes("where") ||
    normalized.includes("origin") ||
    normalized.includes("what happened") ||
    normalized.includes("timeline") ||
    normalized.includes("explain batch") ||
    normalized.includes("எங்கிருந்து") ||
    normalized.includes("எங்கு")
  ) {
    return options.language !== defaultLanguage ? "translate_explain" : "explain_batch";
  }

  return "unknown";
}

async function maybeClassifyIntentWithGroq(input: {
  query: string;
  history: HistoryContextItem[];
  heuristicIntent: SupportedIntent;
  language: string;
  voiceMode: boolean;
}) {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  if (input.language === defaultLanguage && input.heuristicIntent !== "unknown" && !input.voiceMode) {
    return null;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: defaultModel,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Finca AI. Classify the user request into exactly one supported intent and return JSON with keys intent and confidence. Supported intents: create_batch, add_block, validate_chain, get_batch_details, get_dashboard_summary, explain_batch, translate_explain, voice_explain, search_history, tamper_check, unknown. Never invent facts."
        },
        {
          role: "user",
          content: JSON.stringify({
            query: input.query,
            language: input.language,
            voice_mode: input.voiceMode,
            heuristic_intent: input.heuristicIntent,
            history: input.history.slice(-5)
          })
        }
      ]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      }
    | null;

  const content = json?.choices?.[0]?.message?.content;

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as {
      intent?: SupportedIntent;
      confidence?: number;
    };

    if (!parsed.intent) {
      return null;
    }

    return {
      intent: parsed.intent,
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence))
          : null
    };
  } catch {
    return null;
  }
}

async function getLatestBatchIdFromDashboard() {
  const dashboard = await getDashboardData();

  const latest = [...dashboard].sort((left, right) => {
    const leftTime = Date.parse(left.last_timestamp ?? left.created_at ?? "") || 0;
    const rightTime = Date.parse(right.last_timestamp ?? right.created_at ?? "") || 0;
    return rightTime - leftTime;
  })[0];

  return latest?.batch_id ?? null;
}

function getLatestBatchIdFromHistory(history: HistoryContextItem[]) {
  return (
    history
      .slice()
      .reverse()
      .find((item) => item.batch_id)?.batch_id ?? null
  );
}

async function resolveContext(request: AiTurnRequest, history: HistoryContextItem[]): Promise<ResolvedContext> {
  const language = inferLanguage(request.query, request.language);
  const batchMetadata = inferBatchMetadata(request.query, request.context);
  let batchId = request.batch_id ?? request.context?.batch_id ?? extractBatchId(request.query) ?? batchMetadata.batch_id ?? null;

  if (!batchId && shouldResolveRelativeBatch(request.query)) {
    batchId = getLatestBatchIdFromHistory(history);
  }

  if (!batchId && hasAnyPhrase(request.query, ["latest batch", "last batch", "latest chain", "last chain"])) {
    batchId = await getLatestBatchIdFromDashboard();
  }

  return {
    batchId,
    batchMetadata,
    eventType: inferEventType(request.query, request.context?.event_type),
    eventData: inferEventData(request.query, request.context?.data),
    language,
    voiceMode: Boolean(request.voice_mode),
    responseStyle: inferResponseStyle(request.query, request.response_style)
  };
}

function selectRelevantHistory(history: HistoryContextItem[], batchId: string | null) {
  const filtered = batchId ? history.filter((item) => item.batch_id === batchId) : history;
  const selected = filtered.length > 0 ? filtered : history;
  return selected.slice(-5);
}

function makeFollowUpPlan(
  intent: SupportedIntent,
  question: string,
  history: HistoryContextItem[],
  responseStyle: "brief" | "detailed",
  ttsRequired = false
): RouterPlan {
  return {
    intent,
    confidence: 0.45,
    requires_api_call: false,
    api_calls: [],
    history_context_used: history,
    response_style: responseStyle,
    tts_required: ttsRequired,
    follow_up_needed: true,
    follow_up_question: question
  };
}

function blockchainPost(endpoint: string, payload: Record<string, unknown>): RouterApiCall {
  return {
    service: "python_blockchain",
    endpoint,
    method: "POST",
    payload
  };
}

function supabaseGet(endpoint: string, payload: Record<string, unknown> | null): RouterApiCall {
  return {
    service: "supabase",
    endpoint,
    method: "GET",
    payload
  };
}

async function fetchBlockchain<T>(call: RouterApiCall) {
  const response = await fetch(`${getServerApiUrl()}${call.endpoint}`, {
    method: call.method,
    headers: {
      "Content-Type": "application/json"
    },
    body: call.payload ? JSON.stringify(call.payload) : undefined,
    cache: "no-store"
  });

  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (!data) {
    throw new Error("The blockchain service returned an empty response.");
  }

  return data;
}

function summarizeValidation(result: ValidationResponse) {
  return result.valid
    ? "The chain is valid and no broken index was reported."
    : `The chain is invalid${typeof result.invalid_index === "number" ? ` at block ${result.invalid_index}` : ""}.`;
}

function buildDashboardSummaryMessage(dashboard: BatchSummary[], style: "brief" | "detailed") {
  if (dashboard.length === 0) {
    return "There are no batches in the dashboard yet.";
  }

  const latest = [...dashboard].sort((left, right) => {
    const leftTime = Date.parse(left.last_timestamp ?? left.created_at ?? "") || 0;
    const rightTime = Date.parse(right.last_timestamp ?? right.created_at ?? "") || 0;
    return rightTime - leftTime;
  })[0];

  if (style === "detailed") {
    const preview = dashboard
      .slice(0, 5)
      .map((batch) => `${batch.batch_id} (${batch.crop_name}, ${batch.block_count} blocks)`)
      .join(" | ");

    return `Dashboard currently tracks ${dashboard.length} batches. Latest activity: ${latest.batch_id} with ${latest.last_event_type ?? "genesis"} at ${latest.last_timestamp ?? latest.created_at ?? "unknown time"}. Preview: ${preview}.`;
  }

  return `Dashboard tracks ${dashboard.length} batches. Latest activity is on ${latest.batch_id}.`;
}

function buildBatchTimeline(batch: BatchWithBlocks, style: "brief" | "detailed") {
  const selectedBlocks = style === "detailed" ? batch.blocks : batch.blocks.slice(0, 4);

  return selectedBlocks
    .map((block) => `${block.index}. ${toTitleCase(block.event_type)} at ${block.timestamp}`)
    .join(" | ");
}

function buildBatchExplanation(batch: BatchWithBlocks, validation: ValidationResponse | null, style: "brief" | "detailed") {
  const base = `Batch ${batch.batch_id} began at ${batch.farm_location} with ${batch.crop_name} from ${batch.farmer_name}.`;
  const validationText = validation ? ` ${summarizeValidation(validation)}` : "";
  const timeline = buildBatchTimeline(batch, style);

  if (style === "detailed") {
    return `${base}${validationText} Timeline: ${timeline}. Total blocks: ${batch.blocks.length}.`;
  }

  return `${base}${validationText} Latest recorded flow: ${timeline || "No chain events found."}.`;
}

function buildHistorySummary(history: HistoryContextItem[], style: "brief" | "detailed") {
  if (history.length === 0) {
    return "There is no saved router history for this session yet.";
  }

  const entries = history.map((item) => `#${item.turn_id} ${item.summary}`);
  return style === "detailed" ? `Recent router history: ${entries.join(" | ")}` : `Recent router history: ${entries.slice(-3).join(" | ")}`;
}

function buildAudioUrl(sessionId: string, turnId: number) {
  return `/api/ai/audio?session=${encodeURIComponent(sessionId)}&turn=${turnId}`;
}

async function maybeTranslateText(text: string, language: string) {
  if (!process.env.GROQ_API_KEY || language === defaultLanguage) {
    return text;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: defaultModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `Translate the supplied Finca blockchain explanation into ${language}. Keep all blockchain facts unchanged and concise.`
        },
        {
          role: "user",
          content: text
        }
      ]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return text;
  }

  const json = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      }
    | null;

  return json?.choices?.[0]?.message?.content?.trim() || text;
}

function shouldTreatCallFailureAsWarning(plan: RouterPlan, call: RouterApiCall) {
  return call.service === "python_blockchain" && call.endpoint === "/validate" && ["explain_batch", "translate_explain", "voice_explain", "get_batch_details"].includes(plan.intent);
}

export async function buildRouterPlan(request: AiTurnRequest, history: HistoryContextItem[]): Promise<BuildRouterResult> {
  const resolved = await resolveContext(request, history);
  const heuristicIntent = detectIntentHeuristically(request.query, {
    voiceMode: resolved.voiceMode,
    language: resolved.language
  });
  const llmClassification = await maybeClassifyIntentWithGroq({
    query: request.query,
    history,
    heuristicIntent,
    language: resolved.language,
    voiceMode: resolved.voiceMode
  });
  const intent = llmClassification?.intent ?? heuristicIntent;
  const currentBatch = resolved.batchId ? await getBatchChain(resolved.batchId) : null;
  const relevantHistory = selectRelevantHistory(history, resolved.batchId);
  const confidence =
    llmClassification?.confidence ??
    (intent === "unknown" ? 0.4 : resolved.language !== defaultLanguage ? 0.82 : 0.94);

  if (intent === "create_batch") {
    const metadata = resolved.batchMetadata;
    const missingFields = [
      !metadata.batch_id ? "batch ID" : null,
      !metadata.crop_name ? "crop name" : null,
      !metadata.farmer_name ? "farmer name" : null,
      !metadata.farm_location ? "farm location" : null
    ].filter(Boolean) as string[];

    if (metadata.batch_id && currentBatch) {
      return {
        plan: makeFollowUpPlan(
          intent,
          `Batch ${metadata.batch_id} already exists. Use a new batch ID or ask me to explain or validate the existing chain instead.`,
          relevantHistory,
          resolved.responseStyle
        ),
        currentBatch,
        resolved
      };
    }

    if (missingFields.length > 0) {
      return {
        plan: makeFollowUpPlan(
          intent,
          `I still need ${missingFields.join(", ")} to create the batch.`,
          relevantHistory,
          resolved.responseStyle
        ),
        currentBatch,
        resolved
      };
    }

    return {
      plan: {
        intent,
        confidence,
        requires_api_call: true,
        api_calls: [blockchainPost("/batches", metadata as Record<string, unknown>)],
        history_context_used: relevantHistory,
        response_style: resolved.responseStyle,
        tts_required: false,
        follow_up_needed: false,
        follow_up_question: null
      },
      currentBatch,
      resolved
    };
  }

  if (intent === "add_block") {
    if (!resolved.batchId) {
      return {
        plan: makeFollowUpPlan(intent, "Which batch ID should I use for the new event?", relevantHistory, resolved.responseStyle),
        currentBatch,
        resolved
      };
    }

    if (!currentBatch || currentBatch.blocks.length === 0) {
      return {
        plan: makeFollowUpPlan(intent, `I could not find chain state for batch ${resolved.batchId}.`, relevantHistory, resolved.responseStyle),
        currentBatch,
        resolved
      };
    }

    if (!resolved.eventType) {
      return {
        plan: makeFollowUpPlan(intent, "What event type should I append to the batch?", relevantHistory, resolved.responseStyle),
        currentBatch,
        resolved
      };
    }

    const previousBlock = currentBatch.blocks.at(-1)!;
    const payload: CreateBlockPayload = {
      batch_id: resolved.batchId,
      event_type: resolved.eventType,
      data: resolved.eventData,
      previous_hash: previousBlock.hash,
      index: previousBlock.index + 1
    };

    return {
      plan: {
        intent,
        confidence,
        requires_api_call: true,
        api_calls: [blockchainPost("/blocks", payload as unknown as Record<string, unknown>)],
        history_context_used: relevantHistory,
        response_style: resolved.responseStyle,
        tts_required: false,
        follow_up_needed: false,
        follow_up_question: null
      },
      currentBatch,
      resolved
    };
  }

  if (intent === "validate_chain" || intent === "tamper_check") {
    if (!resolved.batchId) {
      return {
        plan: makeFollowUpPlan(intent, "Which batch should I validate?", relevantHistory, resolved.responseStyle),
        currentBatch,
        resolved
      };
    }

    if (!currentBatch || currentBatch.blocks.length === 0) {
      return {
        plan: makeFollowUpPlan(intent, `I could not load any blocks for batch ${resolved.batchId}.`, relevantHistory, resolved.responseStyle),
        currentBatch,
        resolved
      };
    }

    return {
      plan: {
        intent,
        confidence: Math.max(confidence, 0.96),
        requires_api_call: true,
        api_calls: [blockchainPost("/validate", { blocks: currentBatch.blocks })],
        history_context_used: relevantHistory,
        response_style: resolved.responseStyle,
        tts_required: false,
        follow_up_needed: false,
        follow_up_question: null
      },
      currentBatch,
      resolved
    };
  }

  if (intent === "get_dashboard_summary") {
    return {
      plan: {
        intent,
        confidence,
        requires_api_call: true,
        api_calls: [supabaseGet("dashboard_summary", null)],
        history_context_used: relevantHistory,
        response_style: resolved.responseStyle,
        tts_required: false,
        follow_up_needed: false,
        follow_up_question: null
      },
      currentBatch,
      resolved
    };
  }

  if (intent === "get_batch_details" || intent === "explain_batch" || intent === "translate_explain" || intent === "voice_explain") {
    if (!resolved.batchId) {
      return {
        plan: makeFollowUpPlan(
          intent,
          "Which batch should I explain or inspect?",
          relevantHistory,
          resolved.responseStyle,
          intent === "voice_explain" || resolved.voiceMode
        ),
        currentBatch,
        resolved
      };
    }

    const apiCalls: RouterApiCall[] = [supabaseGet("batch_details", { batch_id: resolved.batchId })];

    if (currentBatch?.blocks?.length) {
      apiCalls.push(blockchainPost("/validate", { blocks: currentBatch.blocks }));
    }

    return {
      plan: {
        intent,
        confidence,
        requires_api_call: true,
        api_calls: apiCalls,
        history_context_used: relevantHistory,
        response_style: resolved.responseStyle,
        tts_required: intent === "voice_explain" || resolved.voiceMode,
        follow_up_needed: false,
        follow_up_question: null
      },
      currentBatch,
      resolved
    };
  }

  if (intent === "search_history") {
    return {
      plan: {
        intent,
        confidence,
        requires_api_call: false,
        api_calls: [],
        history_context_used: relevantHistory,
        response_style: resolved.responseStyle,
        tts_required: false,
        follow_up_needed: false,
        follow_up_question: null
      },
      currentBatch,
      resolved
    };
  }

  return {
    plan: makeFollowUpPlan("unknown", "Which batch ID or action should I use?", relevantHistory, resolved.responseStyle),
    currentBatch,
    resolved
  };
}

export async function executeRouterPlan(input: {
  request: AiTurnRequest;
  turnId: number;
  sessionId: string;
  history: HistoryContextItem[];
}): Promise<ExecutionContext & { envelope: AiResponseEnvelope; apiResultSummary: Record<string, unknown> | null }> {
  const { plan, currentBatch, resolved } = await buildRouterPlan(input.request, input.history);
  const warnings: string[] = [];

  if (plan.follow_up_needed) {
    return {
      plan,
      currentBatch,
      resolved,
      apiResultSummary: null,
      envelope: {
        assistant_message: plan.follow_up_question ?? "I need one more detail before I can route that task.",
        intent: plan.intent,
        confidence: plan.confidence,
        router_plan: plan,
        api_calls_made: [],
        history_used: plan.history_context_used,
        execution_results: {},
        audio_url: null,
        requires_user_action: true,
        follow_up_question: plan.follow_up_question,
        session_id: input.sessionId,
        turn_id: input.turnId,
        router_version: routerVersion,
        warnings
      }
    };
  }

  const apiCallsMade: AiResponseEnvelope["api_calls_made"] = [];
  const executionResults: Record<string, unknown> = {};
  let activeBatch = currentBatch;
  let validationResult: ValidationResponse | null = null;
  let assistantMessage = "Task routed successfully.";
  let apiResultSummary: Record<string, unknown> | null = null;
  let audioUrl: string | null = null;

  for (const call of plan.api_calls) {
    try {
      if (call.service === "python_blockchain" && call.endpoint === "/batches") {
        const result = await fetchBlockchain<ApiMutationResponse>(call);
        const payload = call.payload as unknown as CreateBatchPayload;
        const returnedBlock = extractReturnedBlock(result, payload.batch_id);

        if (!returnedBlock) {
          throw new Error("The blockchain service did not return a usable genesis block.");
        }

        executionResults[call.endpoint] = result;
        apiCallsMade.push({ endpoint: call.endpoint, method: call.method, service: call.service, ok: true });

        try {
          await persistBatchAndGenesisServer(
            {
              ...payload,
              created_at: returnedBlock.timestamp
            },
            returnedBlock
          );
        } catch (error) {
          warnings.push(error instanceof Error ? error.message : "Supabase persistence for the genesis block failed.");
        }

        activeBatch = {
          ...payload,
          created_at: returnedBlock.timestamp,
          blocks: [returnedBlock]
        };

        assistantMessage = `Batch ${payload.batch_id} was created and its genesis block was issued as block 0.`;
        apiResultSummary = {
          success: true,
          batch_id: payload.batch_id,
          hash: returnedBlock.hash,
          event_type: returnedBlock.event_type,
          block_index: returnedBlock.index,
          summary: assistantMessage
        };
        continue;
      }

      if (call.service === "python_blockchain" && call.endpoint === "/blocks") {
        const result = await fetchBlockchain<ApiMutationResponse>(call);
        const payload = call.payload as unknown as CreateBlockPayload;
        const returnedBlock = extractReturnedBlock(result, payload.batch_id);

        if (!returnedBlock) {
          throw new Error("The blockchain service did not return a usable block.");
        }

        executionResults[call.endpoint] = result;
        apiCallsMade.push({ endpoint: call.endpoint, method: call.method, service: call.service, ok: true });

        try {
          await persistBlockServer(returnedBlock);
        } catch (error) {
          warnings.push(error instanceof Error ? error.message : "Supabase persistence for the new block failed.");
        }

        if (activeBatch && activeBatch.batch_id === payload.batch_id) {
          activeBatch = {
            ...activeBatch,
            blocks: [...activeBatch.blocks, returnedBlock]
          };
        }

        assistantMessage = `Added ${toTitleCase(payload.event_type)} to batch ${payload.batch_id} as block ${returnedBlock.index}.`;
        apiResultSummary = {
          success: true,
          batch_id: payload.batch_id,
          hash: returnedBlock.hash,
          event_type: returnedBlock.event_type,
          block_index: returnedBlock.index,
          summary: assistantMessage
        };
        continue;
      }

      if (call.service === "python_blockchain" && call.endpoint === "/validate") {
        const rawValidation = await fetchBlockchain<
          | ValidationResponse
          | {
              result?: ValidationResponse;
              valid?: boolean;
              is_valid?: boolean;
              message?: string;
              invalid_index?: number | null;
              broken_index?: number | null;
            }
        >(call);

        validationResult = normalizeValidationResponse(rawValidation);
        executionResults[call.endpoint] = validationResult;
        apiCallsMade.push({ endpoint: call.endpoint, method: call.method, service: call.service, ok: true });

        assistantMessage = summarizeValidation(validationResult);
        apiResultSummary = {
          valid: validationResult.valid,
          invalid_index: validationResult.invalid_index ?? null,
          batch_id: resolved.batchId,
          summary: assistantMessage
        };
        continue;
      }

      if (call.service === "supabase" && call.endpoint === "dashboard_summary") {
        const dashboard = await getDashboardData();
        executionResults.dashboard_summary = dashboard;
        apiCallsMade.push({ endpoint: call.endpoint, method: call.method, service: call.service, ok: true });

        assistantMessage = buildDashboardSummaryMessage(dashboard, plan.response_style);
        apiResultSummary = {
          batch_count: dashboard.length,
          summary: assistantMessage
        };
        continue;
      }

      if (call.service === "supabase" && call.endpoint === "batch_details" && resolved.batchId) {
        activeBatch = await getBatchChain(resolved.batchId);
        executionResults.batch_details = activeBatch;
        apiCallsMade.push({ endpoint: call.endpoint, method: call.method, service: call.service, ok: true });

        assistantMessage = activeBatch
          ? `Loaded batch ${activeBatch.batch_id} with ${activeBatch.blocks.length} recorded blocks.`
          : `Batch ${resolved.batchId} was not found in Supabase.`;
        apiResultSummary = {
          batch_id: resolved.batchId,
          block_count: activeBatch?.blocks.length ?? 0,
          summary: assistantMessage
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The router failed while executing an API call.";
      apiCallsMade.push({ endpoint: call.endpoint, method: call.method, service: call.service, ok: false });

      if (shouldTreatCallFailureAsWarning(plan, call)) {
        warnings.push(message);
        continue;
      }

      throw error;
    }
  }

  if (plan.intent === "validate_chain" || plan.intent === "tamper_check") {
    if (!validationResult) {
      throw new Error("Validation did not return a result.");
    }

    assistantMessage = summarizeValidation(validationResult);
    apiResultSummary = {
      valid: validationResult.valid,
      invalid_index: validationResult.invalid_index ?? null,
      batch_id: resolved.batchId,
      summary: assistantMessage
    };
  }

  if (plan.intent === "get_batch_details" || plan.intent === "explain_batch" || plan.intent === "translate_explain" || plan.intent === "voice_explain") {
    if (!activeBatch) {
      assistantMessage = resolved.batchId
        ? `I could not find batch ${resolved.batchId} in Supabase.`
        : "I could not determine which batch to explain.";
      warnings.push("Batch explanation was requested without a readable batch chain.");
    } else {
      const baseExplanation =
        plan.intent === "get_batch_details"
          ? `Batch ${activeBatch.batch_id} has ${activeBatch.blocks.length} blocks. ${buildBatchExplanation(activeBatch, validationResult, plan.response_style)}`
          : buildBatchExplanation(activeBatch, validationResult, plan.response_style);

      assistantMessage =
        plan.intent === "translate_explain" || plan.intent === "voice_explain" || resolved.language !== defaultLanguage
          ? await maybeTranslateText(baseExplanation, resolved.language)
          : baseExplanation;
    }

    apiResultSummary = {
      batch_id: resolved.batchId,
      block_count: activeBatch?.blocks.length ?? 0,
      valid: validationResult?.valid ?? null,
      summary: assistantMessage
    };
  }

  if (plan.intent === "search_history") {
    assistantMessage = buildHistorySummary(plan.history_context_used, plan.response_style);
    apiResultSummary = {
      history_count: plan.history_context_used.length,
      batch_id: resolved.batchId,
      summary: assistantMessage
    };
  }

  if (plan.tts_required) {
    audioUrl = buildAudioUrl(input.sessionId, input.turnId);
    warnings.push("TTS is scaffolded but still needs a real provider wired into /api/ai/audio.");
  }

  return {
    plan,
    currentBatch: activeBatch,
    resolved,
    apiResultSummary,
    envelope: {
      assistant_message: assistantMessage,
      intent: plan.intent,
      confidence: plan.confidence,
      router_plan: plan,
      api_calls_made: apiCallsMade,
      history_used: plan.history_context_used,
      execution_results: executionResults,
      audio_url: audioUrl,
      requires_user_action: false,
      follow_up_question: null,
      session_id: input.sessionId,
      turn_id: input.turnId,
      router_version: routerVersion,
      warnings
    }
  };
}

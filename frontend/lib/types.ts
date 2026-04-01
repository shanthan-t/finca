export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type BlockData = Record<string, JsonValue>;

export interface Batch {
  batch_id: string;
  crop_name: string;
  farmer_name: string;
  farm_location: string;
  created_at?: string | null;
}

export interface Block {
  batch_id: string;
  index: number;
  timestamp: string;
  event_type: string;
  data: BlockData;
  previous_hash: string;
  hash: string;
}

export interface BatchWithBlocks extends Batch {
  blocks: Block[];
}

export interface BatchSummary extends Batch {
  block_count: number;
  last_event_type: string | null;
  last_timestamp: string | null;
}

export interface ValidationResponse {
  valid: boolean;
  message?: string;
  invalid_index?: number | null;
  details?: string | null;
}

export interface CreateBatchPayload {
  batch_id: string;
  crop_name: string;
  farmer_name: string;
  farm_location: string;
}

export interface CreateBlockPayload {
  batch_id: string;
  event_type: string;
  data: BlockData;
  previous_hash: string;
  index: number;
}

export interface ValidatePayload {
  blocks: Block[];
}

export interface ApiMutationResponse {
  success?: boolean;
  message?: string;
  batch?: Batch;
  block?: Block;
  [key: string]: unknown;
}

export interface Database {
  public: {
    Tables: {
      ai_router_history: {
        Row: AiRouterHistoryRow;
        Insert: AiRouterHistoryInsert;
        Update: Partial<AiRouterHistoryInsert>;
        Relationships: [];
      };
      batches: {
        Row: Batch;
        Insert: Batch;
        Update: Partial<Batch>;
        Relationships: [];
      };
      blocks: {
        Row: Block;
        Insert: Block;
        Update: Partial<Block>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type SupportedIntent =
  | "create_batch"
  | "add_block"
  | "validate_chain"
  | "get_batch_details"
  | "get_dashboard_summary"
  | "explain_batch"
  | "translate_explain"
  | "voice_explain"
  | "search_history"
  | "tamper_check"
  | "unknown";

export interface RouterApiCall {
  service: "python_blockchain" | "supabase" | "tts";
  endpoint: string;
  method: "GET" | "POST";
  payload: Record<string, unknown> | null;
}

export interface HistoryContextItem {
  turn_id: number;
  type: string;
  summary: string;
  batch_id?: string | null;
  event_type?: string | null;
  hash?: string | null;
}

export interface RouterPlan {
  intent: SupportedIntent;
  confidence: number;
  requires_api_call: boolean;
  api_calls: RouterApiCall[];
  history_context_used: HistoryContextItem[];
  response_style: "brief" | "detailed";
  tts_required: boolean;
  follow_up_needed: boolean;
  follow_up_question: string | null;
}

export interface AiTurnRequest {
  query: string;
  language?: string;
  voice_mode?: boolean;
  session_id?: string;
  batch_id?: string;
  response_style?: "brief" | "detailed";
  context?: {
    batch_id?: string;
    crop_name?: string;
    farmer_name?: string;
    farm_location?: string;
    event_type?: string;
    data?: BlockData;
  };
}

export interface AiRouterHistoryEntry {
  turn_id: number;
  timestamp: string;
  user_query: string;
  intent: SupportedIntent;
  api_call: RouterApiCall | null;
  api_result_summary: Record<string, unknown> | null;
  assistant_message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AiResponseEnvelope {
  assistant_message: string;
  intent: SupportedIntent;
  confidence: number;
  router_plan: RouterPlan;
  api_calls_made: Array<{
    endpoint: string;
    method: "GET" | "POST";
    service: "python_blockchain" | "supabase" | "tts";
    ok: boolean;
  }>;
  history_used: HistoryContextItem[];
  execution_results: Record<string, unknown>;
  audio_url: string | null;
  requires_user_action: boolean;
  follow_up_question: string | null;
  session_id: string;
  turn_id: number;
  router_version: string;
  warnings: string[];
}

export interface AiRouterHistoryRow {
  id: string;
  turn_id: number;
  session_id: string;
  user_query: string;
  intent: SupportedIntent;
  api_call: RouterApiCall | null;
  api_result_summary: Record<string, unknown> | null;
  assistant_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiRouterHistoryInsert {
  id?: string;
  turn_id: number;
  session_id: string;
  user_query: string;
  intent: SupportedIntent;
  api_call?: RouterApiCall | null;
  api_result_summary?: Record<string, unknown> | null;
  assistant_message?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

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
  farmer_phone?: string | null;
  farmer_verified?: boolean | null;
  qr_code_url?: string | null;
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

export interface BatchEnhancements {
  farmer_phone?: string | null;
  farmer_verified?: boolean | null;
  qr_code_url?: string | null;
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

export interface AIRouterHistoryRow {
  turn_id: number;
  session_id: string;
  user_query: string;
  intent: string;
  api_call?: JsonValue | null;
  api_result_summary?: string | null;
  assistant_message: string;
  metadata?: JsonValue | null;
  created_at?: string | null;
}

export interface Database {
  public: {
    Tables: {
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
      ai_router_history: {
        Row: AIRouterHistoryRow;
        Insert: Omit<AIRouterHistoryRow, "turn_id"> & { turn_id?: number };
        Update: Partial<AIRouterHistoryRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type AIApiService = "python_blockchain" | "supabase" | "tts";

export interface AIApiCall {
  endpoint: string;
  method: string;
  service?: AIApiService;
  ok?: boolean;
}

export interface AIPlannedApiCall extends AIApiCall {
  service: AIApiService;
  payload?: Record<string, unknown>;
}

export type AIResponseStyle = "brief" | "balanced" | "detailed" | (string & {});
export type AIIntent =
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

export type KnownAssistantAction =
  | "SHOW_BATCH_DETAILS"
  | "SHOW_DASHBOARD"
  | "SHOW_VERIFICATION_RESULT"
  | "SHOW_ERROR"
  | "PLAY_AUDIO";

export type AssistantUIAction = KnownAssistantAction | (string & {});

export interface AIHistoryEntry {
  turn_id: number;
  type: string;
  summary: string;
  user_query?: string;
  batch_id: string | null;
  event_type: string | null;
  hash: string | null;
}

export interface AIRouterPlan {
  intent: AIIntent | string;
  confidence?: number;
  requires_api_call?: boolean;
  api_calls?: AIPlannedApiCall[];
  history_context_used?: AIHistoryEntry[];
  response_style?: AIResponseStyle;
  tts_required?: boolean;
  follow_up_needed?: boolean;
  follow_up_question?: string | null;
  [key: string]: unknown;
}

export interface AIQueryContext {
  batch_id?: string;
  crop_name?: string;
  farmer_name?: string;
  farm_location?: string;
  event_type?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AIResponse {
  assistant_message: string;
  intent: AIIntent | string;
  ui_action?: AssistantUIAction | null;
  data: Record<string, unknown>;
  confidence?: number;
  router_plan?: AIRouterPlan | null;
  api_calls_made?: AIApiCall[];
  history_used?: AIHistoryEntry[];
  execution_results?: Record<string, unknown>;
  audio_url?: string | null;
  requires_user_action?: boolean;
  follow_up_question?: string | null;
  session_id?: string;
  turn_id?: number;
  router_version?: string;
  warnings?: string[];
}

export interface AIQueryRequest {
  query: string;
  batch_id?: string;
  session_id?: string;
  language?: string;
  voice_mode?: boolean;
  response_style?: AIResponseStyle;
  context?: AIQueryContext;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AIResponse;
  audioUrl?: string | null;
  autoplayAudio?: boolean;
}

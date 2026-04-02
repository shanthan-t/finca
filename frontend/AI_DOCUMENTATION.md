# Finca AI Documentation

This document describes the Finca AI route, its request and response JSON, supported intents, behavior rules, and deployment requirements.

The AI layer is not a freeform chatbot.

It is a server-side task router that:

- reads the user query
- resolves batch context from history and Supabase
- decides what blockchain or data action is needed
- executes the action
- returns a structured JSON envelope
- logs the turn into `ai_router_history`

## Route

### `GET /api/ai`

Returns a lightweight description of the current request schema.

### `POST /api/ai`

Accepts a natural-language task request and returns a structured AI execution response.

## Request JSON

### Schema

```json
{
  "query": "string",
  "language": "string, optional",
  "voice_mode": "boolean, optional",
  "session_id": "string, optional",
  "batch_id": "string, optional",
  "response_style": "brief | detailed, optional",
  "context": {
    "batch_id": "string, optional",
    "crop_name": "string, optional",
    "farmer_name": "string, optional",
    "farm_location": "string, optional",
    "event_type": "string, optional",
    "data": "object, optional"
  }
}
```

### Field meanings

- `query`
  The natural-language instruction or question.

- `language`
  Preferred response language such as `en` or `ta`.

- `voice_mode`
  If `true`, the router marks the response as voice-oriented and returns `audio_url` when available.

- `session_id`
  Conversation bucket for AI history lookup and storage.

- `batch_id`
  Explicit batch to use when the query should not rely on history resolution.

- `response_style`
  `brief` or `detailed`.

- `context`
  Extra trusted fields the UI can pass to reduce ambiguity.

## Request Examples

### 1. Create batch

```json
{
  "query": "Create a rice batch for Ravi in Tamil Nadu with batch ID RICE-001",
  "session_id": "demo-session",
  "response_style": "brief",
  "context": {
    "batch_id": "RICE-001",
    "crop_name": "Rice",
    "farmer_name": "Ravi",
    "farm_location": "Tamil Nadu"
  }
}
```

### 2. Add event

```json
{
  "query": "Add shipped event for batch RICE-001",
  "session_id": "demo-session",
  "language": "en",
  "voice_mode": false,
  "response_style": "brief",
  "context": {
    "event_type": "shipped",
    "data": {
      "actor": "Transporter A",
      "location": "Chennai",
      "status": "in transit"
    }
  }
}
```

### 3. Validate chain

```json
{
  "query": "Validate batch RICE-001",
  "session_id": "demo-session",
  "batch_id": "RICE-001",
  "response_style": "brief"
}
```

### 4. Explain batch in Tamil

```json
{
  "query": "இந்த batch எங்கிருந்து வந்தது?",
  "session_id": "demo-session",
  "batch_id": "RICE-001",
  "language": "ta",
  "response_style": "detailed"
}
```

## Response JSON

### Main response schema

```json
{
  "assistant_message": "string",
  "intent": "create_batch | add_block | validate_chain | get_batch_details | get_dashboard_summary | explain_batch | translate_explain | voice_explain | search_history | tamper_check | unknown",
  "confidence": 0.95,
  "router_plan": {
    "intent": "string",
    "confidence": 0.95,
    "requires_api_call": true,
    "api_calls": [
      {
        "service": "python_blockchain | supabase | tts",
        "endpoint": "string",
        "method": "GET | POST",
        "payload": {}
      }
    ],
    "history_context_used": [
      {
        "turn_id": 1,
        "type": "string",
        "summary": "string",
        "batch_id": "string or null",
        "event_type": "string or null",
        "hash": "string or null"
      }
    ],
    "response_style": "brief | detailed",
    "tts_required": false,
    "follow_up_needed": false,
    "follow_up_question": null
  },
  "api_calls_made": [
    {
      "endpoint": "string",
      "method": "GET | POST",
      "service": "python_blockchain | supabase | tts",
      "ok": true
    }
  ],
  "history_used": [
    {
      "turn_id": 1,
      "type": "string",
      "summary": "string",
      "batch_id": "string or null",
      "event_type": "string or null",
      "hash": "string or null"
    }
  ],
  "execution_results": {},
  "audio_url": "string or null",
  "requires_user_action": false,
  "follow_up_question": null,
  "session_id": "string",
  "turn_id": 7,
  "router_version": "2026-04-01.2",
  "warnings": []
}
```

## Response Examples

### 1. Successful add block

```json
{
  "assistant_message": "Added Shipped to batch RICE-001 as block 1.",
  "intent": "add_block",
  "confidence": 0.94,
  "router_plan": {
    "intent": "add_block",
    "confidence": 0.94,
    "requires_api_call": true,
    "api_calls": [
      {
        "service": "python_blockchain",
        "endpoint": "/blocks",
        "method": "POST",
        "payload": {
          "batch_id": "RICE-001",
          "event_type": "shipped",
          "data": {
            "actor": "Transporter A",
            "location": "Chennai",
            "status": "in transit"
          },
          "previous_hash": "abc123",
          "index": 1
        }
      }
    ],
    "history_context_used": [
      {
        "turn_id": 1,
        "type": "create_batch",
        "summary": "Batch RICE-001 was created and its genesis block was issued as block 0.",
        "batch_id": "RICE-001",
        "event_type": "batch_created",
        "hash": "abc123"
      }
    ],
    "response_style": "brief",
    "tts_required": false,
    "follow_up_needed": false,
    "follow_up_question": null
  },
  "api_calls_made": [
    {
      "endpoint": "/blocks",
      "method": "POST",
      "service": "python_blockchain",
      "ok": true
    }
  ],
  "history_used": [
    {
      "turn_id": 1,
      "type": "create_batch",
      "summary": "Batch RICE-001 was created and its genesis block was issued as block 0.",
      "batch_id": "RICE-001",
      "event_type": "batch_created",
      "hash": "abc123"
    }
  ],
  "execution_results": {
    "/blocks": {
      "success": true
    }
  },
  "audio_url": null,
  "requires_user_action": false,
  "follow_up_question": null,
  "session_id": "demo-session",
  "turn_id": 2,
  "router_version": "2026-04-01.2",
  "warnings": []
}
```

### 2. Successful validate chain

```json
{
  "assistant_message": "The chain is valid and no broken index was reported.",
  "intent": "validate_chain",
  "confidence": 0.96,
  "router_plan": {
    "intent": "validate_chain",
    "confidence": 0.96,
    "requires_api_call": true,
    "api_calls": [
      {
        "service": "python_blockchain",
        "endpoint": "/validate",
        "method": "POST",
        "payload": {
          "blocks": []
        }
      }
    ],
    "history_context_used": [],
    "response_style": "brief",
    "tts_required": false,
    "follow_up_needed": false,
    "follow_up_question": null
  },
  "api_calls_made": [
    {
      "endpoint": "/validate",
      "method": "POST",
      "service": "python_blockchain",
      "ok": true
    }
  ],
  "history_used": [],
  "execution_results": {
    "/validate": {
      "valid": true,
      "invalid_index": null
    }
  },
  "audio_url": null,
  "requires_user_action": false,
  "follow_up_question": null,
  "session_id": "demo-session",
  "turn_id": 3,
  "router_version": "2026-04-01.2",
  "warnings": []
}
```

### 3. Follow-up required

```json
{
  "assistant_message": "Which batch ID should I use for the new event?",
  "intent": "add_block",
  "confidence": 0.45,
  "router_plan": {
    "intent": "add_block",
    "confidence": 0.45,
    "requires_api_call": false,
    "api_calls": [],
    "history_context_used": [],
    "response_style": "brief",
    "tts_required": false,
    "follow_up_needed": true,
    "follow_up_question": "Which batch ID should I use for the new event?"
  },
  "api_calls_made": [],
  "history_used": [],
  "execution_results": {},
  "audio_url": null,
  "requires_user_action": true,
  "follow_up_question": "Which batch ID should I use for the new event?",
  "session_id": "demo-session",
  "turn_id": 4,
  "router_version": "2026-04-01.2",
  "warnings": []
}
```

## Error JSON

### 400 invalid JSON

```json
{
  "message": "The request body must be valid JSON."
}
```

### 400 missing query

```json
{
  "message": "The `query` field is required."
}
```

### 400 query too long

```json
{
  "message": "The `query` field is too long."
}
```

### 500 execution failure

```json
{
  "message": "The AI router failed to complete the request."
}
```

The actual 500 message may be more specific if the thrown error includes a custom message.

## Supported Intents

- `create_batch`
- `add_block`
- `validate_chain`
- `get_batch_details`
- `get_dashboard_summary`
- `explain_batch`
- `translate_explain`
- `voice_explain`
- `search_history`
- `tamper_check`
- `unknown`

## AI Router Behavior

The router follows these rules:

- prefer real chain state from Supabase over guessing
- use session history for references like `it`, `this batch`, or `the last one`
- do not invent batch IDs, hashes, or validation results
- use the blockchain backend for trusted chain operations
- persist AI-created batches and blocks back into Supabase
- return follow-up questions instead of guessing when required fields are missing

## History Model

Every successful or attempted turn can be logged into `ai_router_history`.

Stored fields include:

- `turn_id`
- `session_id`
- `user_query`
- `intent`
- `api_call`
- `api_result_summary`
- `assistant_message`
- `metadata`

The AI route uses this history to resolve recent context such as:

- last batch used
- last event type used
- recent hash references
- recent explanations or validation results

## Environment Variables

The AI route depends on:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
API_URL=
GROQ_API_KEY=
FINCA_AI_MODEL=llama-3.3-70b-versatile
SUPABASE_SERVICE_ROLE_KEY=
```

### Required vs optional

- Required for full AI routing:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `API_URL`

- Recommended:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GROQ_API_KEY`

- Optional:
  - `FINCA_AI_MODEL`

If `GROQ_API_KEY` is missing, the route still works in heuristic fallback mode.

## Current Limitations

- TTS is scaffolded but not connected to a real audio provider yet
- `audio_url` is only meaningful after a real TTS implementation is added
- first-time Render deploys can take longer because of cold dependency and build startup

## Curl Example

```bash
curl -X POST "https://your-frontend-domain/api/ai" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Validate batch RICE-001",
    "session_id": "demo-session",
    "batch_id": "RICE-001",
    "response_style": "brief"
  }'
```

## Related Files

- `app/api/ai/route.ts`
- `lib/ai/router.ts`
- `lib/ai/history.ts`
- `lib/types.ts`
- `lib/persistence-server.ts`
- `supabase/migrations/20260401_add_ai_router_history.sql`

This document is the canonical AI JSON and response reference for the current Finca frontend.

import type { AIResponse } from "@/lib/types";

interface ActionRouter {
  push: (href: string) => void;
}

interface ActionHandlerOptions {
  response: AIResponse;
  router: ActionRouter;
  setValidationResult: (data: Record<string, unknown> | null) => void;
  setError: (message: string | null) => void;
  playAudio: (audioUrl: string, autoplay?: boolean) => void;
}

function getActionData(response: AIResponse) {
  if (response.data && Object.keys(response.data).length > 0) {
    return response.data;
  }

  if (response.execution_results && Object.keys(response.execution_results).length > 0) {
    return response.execution_results;
  }

  return {};
}

function getBatchId(data: Record<string, unknown>) {
  return typeof data.batch_id === "string" ? data.batch_id : null;
}

function getEffectiveAction(response: AIResponse) {
  if (response.ui_action) {
    return response.ui_action;
  }

  if (response.audio_url) {
    return "PLAY_AUDIO";
  }

  if (response.requires_user_action) {
    return "SHOW_ERROR";
  }

  switch (response.intent) {
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

export function handleAssistantAction({
  response,
  router,
  setValidationResult,
  setError,
  playAudio
}: ActionHandlerOptions) {
  const actionData = getActionData(response);
  const action = getEffectiveAction(response);

  switch (action) {
    case "SHOW_BATCH_DETAILS": {
      const batchId = getBatchId(actionData);

      if (!batchId) {
        setError("The assistant asked to open batch details, but no batch_id was provided.");
        return;
      }

      router.push(`/batch/${batchId}`);
      return;
    }

    case "SHOW_DASHBOARD":
      router.push("/dashboard");
      return;

    case "SHOW_VERIFICATION_RESULT":
      setValidationResult(Object.keys(actionData).length > 0 ? actionData : null);
      return;

    case "SHOW_ERROR":
      if (response.requires_user_action || response.follow_up_question) {
        setError(null);
        return;
      }

      setError(response.assistant_message || "The assistant reported an error.");
      return;

    case "PLAY_AUDIO":
      if (response.audio_url) {
        playAudio(response.audio_url, true);
      } else {
        setError("The assistant requested audio playback, but no audio_url was provided.");
      }
      return;

    default:
      return;
  }
}

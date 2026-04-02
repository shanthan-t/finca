"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Mic, MicOff, SendHorizontal, Sparkles, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { ChatMessage } from "@/components/ChatMessage";
import { useLanguage } from "@/components/providers/language-provider";
import { handleAssistantAction } from "@/lib/actionHandler";
import { sendAIQuery } from "@/lib/aiClient";
import { cn, toTitleCase } from "@/lib/utils";
import type { AIChatMessage, AIQueryContext, AIQueryRequest, AIResponse, AIResponseStyle } from "@/lib/types";

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getValidationFlag(data: Record<string, unknown> | null) {
  if (!data) {
    return null;
  }

  if (typeof data.valid === "boolean") {
    return data.valid;
  }

  if (typeof data.is_valid === "boolean") {
    return data.is_valid;
  }

  return null;
}

function renderValue(value: unknown, fallbackLabel: string) {
  if (value === null || value === undefined) {
    return fallbackLabel;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getBatchIdFromResponse(response: AIResponse | null) {
  if (!response) {
    return null;
  }

  if (typeof response.data?.batch_id === "string" && response.data.batch_id.trim()) {
    return response.data.batch_id;
  }

  const executionBatch = response.execution_results?.batch;

  if (
    executionBatch &&
    typeof executionBatch === "object" &&
    "batch_id" in executionBatch &&
    typeof executionBatch.batch_id === "string"
  ) {
    return executionBatch.batch_id;
  }

  const validationBatch = response.execution_results?.["/validate"];

  if (
    validationBatch &&
    typeof validationBatch === "object" &&
    "batch_id" in validationBatch &&
    typeof validationBatch.batch_id === "string"
  ) {
    return validationBatch.batch_id;
  }

  return null;
}

function getReadableActionLabel(
  value: string | null,
  fallbackLabel: string,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  if (!value) {
    return fallbackLabel;
  }

  const knownLabels: Record<string, string> = {
    SHOW_BATCH_DETAILS: t("assistant.actionShowBatchDetails"),
    SHOW_DASHBOARD: t("assistant.actionShowDashboard"),
    SHOW_VERIFICATION_RESULT: t("assistant.actionShowVerification"),
    SHOW_ERROR: t("assistant.actionShowError"),
    PLAY_AUDIO: t("assistant.actionPlayAudio"),
    create_batch: t("assistant.intentCreateBatch"),
    add_block: t("assistant.intentAddBlock"),
    validate_chain: t("assistant.intentValidateChain"),
    get_batch_details: t("assistant.intentGetBatchDetails"),
    explain_batch: t("assistant.intentExplainBatch"),
    translate_explain: t("assistant.intentTranslateExplain"),
    voice_explain: t("assistant.intentVoiceExplain"),
    get_dashboard_summary: t("assistant.intentDashboardSummary"),
    search_history: t("assistant.intentSearchHistory"),
    tamper_check: t("assistant.intentTamperCheck")
  };

  if (value in knownLabels) {
    return knownLabels[value];
  }

  return toTitleCase(value);
}

function getPromptBatchId(prompt: string) {
  const match = prompt.match(/\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b/);
  return match?.[0] ?? null;
}

function getFollowUpPrompt(
  intent: string,
  activeBatchId: string | null,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  const fallbackBatchId = activeBatchId ?? "RICE-001";

  switch (intent) {
    case "create_batch":
      return t("assistant.promptCreate", { batchId: fallbackBatchId });
    case "add_block":
      return t("assistant.promptAddEvent", { batchId: fallbackBatchId });
    case "validate_chain":
    case "tamper_check":
      return t("assistant.promptValidate", { batchId: fallbackBatchId });
    case "get_batch_details":
    case "explain_batch":
    case "translate_explain":
    case "voice_explain":
      return t("assistant.promptExplain", { batchId: fallbackBatchId });
    default:
      return null;
  }
}

function buildSuggestedPrompts(
  response: AIResponse | null,
  activeBatchId: string | null,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  const prompts: string[] = [];
  const followUpPrompt = getFollowUpPrompt(response?.intent ?? "unknown", activeBatchId, t);

  if (followUpPrompt) {
    prompts.push(followUpPrompt);
  }

  if (activeBatchId) {
    prompts.push(t("assistant.promptExplain", { batchId: activeBatchId }));
    prompts.push(t("assistant.promptValidate", { batchId: activeBatchId }));
    prompts.push(t("assistant.promptShow", { batchId: activeBatchId }));
    prompts.push(t("assistant.promptAddEvent", { batchId: activeBatchId }));
  } else {
    prompts.push(t("assistant.promptCreate", { batchId: "RICE-001" }));
    prompts.push(t("assistant.promptDashboard"));
    prompts.push(t("assistant.promptCount"));
    prompts.push(t("assistant.promptHistory"));
  }

  return Array.from(new Set(prompts)).slice(0, 4);
}

function getPendingFollowUpContext(response: AIResponse | null): AIQueryContext {
  if (!response?.requires_user_action) {
    return {};
  }

  const payloadCandidate = response.router_plan?.api_calls?.find(
    (call) => call.payload && typeof call.payload === "object" && !Array.isArray(call.payload)
  )?.payload;

  if (!payloadCandidate || typeof payloadCandidate !== "object" || Array.isArray(payloadCandidate)) {
    return {};
  }

  const payload = payloadCandidate as Record<string, unknown>;
  const payloadData =
    payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : undefined;

  return {
    ...(typeof payload.batch_id === "string" && payload.batch_id.trim()
      ? { batch_id: payload.batch_id }
      : {}),
    ...(typeof payload.crop_name === "string" && payload.crop_name.trim()
      ? { crop_name: payload.crop_name }
      : {}),
    ...(typeof payload.farmer_name === "string" && payload.farmer_name.trim()
      ? { farmer_name: payload.farmer_name }
      : {}),
    ...(typeof payload.farm_location === "string" && payload.farm_location.trim()
      ? { farm_location: payload.farm_location }
      : {}),
    ...(typeof payload.event_type === "string" && payload.event_type.trim()
      ? { event_type: payload.event_type }
      : {}),
    ...(payloadData && Object.keys(payloadData).length > 0 ? { data: payloadData } : {})
  };
}

interface AIChatProps {
  initialBatchId?: string;
  mode?: "full" | "simple";
}

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
  length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface BrowserSpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognitionInstance;

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function getSpeechLanguage(
  language: string,
  options: ReadonlyArray<{ value: string; speechLocale: string }>
) {
  return options.find((option) => option.value === language)?.speechLocale ?? "en-US";
}

export function AIChat({ initialBatchId = "", mode = "full" }: AIChatProps) {
  const { language, languages, setLanguagePreference, t } = useLanguage();
  const router = useRouter();
  const reactId = useId();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const queryRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  const speechCommittedQueryRef = useRef("");
  const speechShouldRestartRef = useRef(false);
  const sessionId = useMemo(() => `session-${reactId.replace(/:/g, "")}`, [reactId]);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [batchId, setBatchId] = useState(initialBatchId);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [responseStyle, setResponseStyle] = useState<AIResponseStyle>("brief");
  const [isLoading, setIsLoading] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const isSimpleMode = mode === "simple";

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isLoading, messages, validationResult, actionError]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const inferredBatchId = getBatchIdFromResponse(lastResponse);

    if (inferredBatchId) {
      setBatchId(inferredBatchId);
    }
  }, [lastResponse]);

  useEffect(() => {
    if (lastResponse?.requires_user_action && lastResponse.follow_up_question) {
      queryRef.current?.focus();
    }
  }, [lastResponse]);

  const validationFlag = useMemo(() => getValidationFlag(validationResult), [validationResult]);
  const validationEntries = useMemo(() => Object.entries(validationResult ?? {}), [validationResult]);
  const activeBatchId = useMemo(() => batchId.trim() || getBatchIdFromResponse(lastResponse) || null, [batchId, lastResponse]);
  const pendingFollowUpContext = useMemo(() => getPendingFollowUpContext(lastResponse), [lastResponse]);
  const suggestedPrompts = useMemo(
    () => buildSuggestedPrompts(lastResponse, activeBatchId, t),
    [activeBatchId, lastResponse, t]
  );
  const activeFollowUpQuestion =
    lastResponse?.requires_user_action && lastResponse.follow_up_question ? lastResponse.follow_up_question : null;
  const queryPlaceholder = activeFollowUpQuestion
    ? activeFollowUpQuestion
    : activeBatchId
      ? t("assistant.placeholderWithBatch", { batchId: activeBatchId })
      : t("assistant.placeholderWithoutBatch");

  const applyPrompt = (prompt: string) => {
    const promptBatchId = getPromptBatchId(prompt);

    if (promptBatchId) {
      setBatchId(promptBatchId);
    }

    setQuery(prompt);
    setActionError(null);
    queryRef.current?.focus();
  };

  const stopListening = () => {
    speechShouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startListening = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setSpeechError(t("assistant.speechUnsupported"));
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechLanguage(language, languages);
    recognition.continuous = true;
    recognition.interimResults = true;

    speechCommittedQueryRef.current = query.trim();
    speechShouldRestartRef.current = true;
    setSpeechError(null);
    setIsListening(true);

    recognition.onresult = (event) => {
      let committedSegment = "";
      let interimSegment = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim() ?? "";

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          committedSegment += `${transcript} `;
        } else {
          interimSegment += `${transcript} `;
        }
      }

      if (committedSegment.trim()) {
        speechCommittedQueryRef.current = [speechCommittedQueryRef.current, committedSegment.trim()]
          .filter(Boolean)
          .join(" ")
          .trim();
      }

      const nextQuery = [speechCommittedQueryRef.current, interimSegment.trim()].filter(Boolean).join(" ").trim();

      setQuery(nextQuery);
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setSpeechError(t("assistant.speechStopped", { error: event.error }));
      }

      speechShouldRestartRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      if (speechShouldRestartRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          speechShouldRestartRef.current = false;
        }
      }

      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setSpeechError(t("assistant.speechUnsupported"));
      setIsListening(false);
    }
  };

  const submitQuery = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery || isLoading) {
      return;
    }

    if (isListening) {
      stopListening();
    }

    const userMessage: AIChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmedQuery
    };

    setMessages((current) => [...current, userMessage]);
    setQuery("");
    setIsLoading(true);
    setActionError(null);

    const effectiveBatchId =
      activeBatchId ||
      (typeof pendingFollowUpContext.batch_id === "string" ? pendingFollowUpContext.batch_id.trim() : "");
    const requestContext: AIQueryContext = {
      ...pendingFollowUpContext,
      ...(effectiveBatchId
        ? {
            batch_id: effectiveBatchId
          }
        : {})
    };

    const payload: AIQueryRequest = {
      query: trimmedQuery,
      session_id: sessionId,
      language,
      voice_mode: voiceEnabled,
      response_style: responseStyle,
      ...(effectiveBatchId
        ? {
            batch_id: effectiveBatchId
          }
        : {}),
      ...(Object.keys(requestContext).length > 0
        ? {
            context: requestContext
          }
        : {})
    };

    try {
      const response = await sendAIQuery(payload);
      setLastResponse(response);
      setLastAction(response.ui_action ?? response.intent ?? "NO_UI_ACTION_RETURNED");

      const playbackRequest = {
        url: response.audio_url ?? null,
        autoplay: Boolean(response.audio_url && voiceEnabled)
      };

      const assistantMessage: AIChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: response.assistant_message,
        response,
        audioUrl: response.audio_url ?? null,
        autoplayAudio: playbackRequest.autoplay
      };

      handleAssistantAction({
        response,
        router,
        setValidationResult,
        setError: setActionError,
        playAudio: (audioUrl, autoplay = true) => {
          playbackRequest.url = audioUrl;
          playbackRequest.autoplay = autoplay;
        }
      });

      assistantMessage.audioUrl = playbackRequest.url;
      assistantMessage.autoplayAudio = Boolean(playbackRequest.url && playbackRequest.autoplay);

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("assistant.requestFailed");

      setActionError(message);
      setLastAction("SHOW_ERROR");
      setLastResponse(null);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: message
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("grid gap-6", !isSimpleMode && "xl:grid-cols-[1.15fr_0.85fr]")}>
      <div className={cn("glass-panel flex flex-col p-6 lg:p-8", isSimpleMode ? "min-h-[640px]" : "min-h-[720px]")}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("assistant.eyebrow")}</p>
            <h1 className="text-3xl font-semibold text-black">
              {isSimpleMode ? t("assistant.titleSimple") : t("assistant.titleFull")}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-black/68">
              {isSimpleMode
                ? t("assistant.descriptionSimple")
                : t("assistant.descriptionFull")}
            </p>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">
              {isSimpleMode ? t("assistant.currentBatch") : t("assistant.currentContext")}
            </p>
            <p className="mt-2 text-sm font-semibold text-black">
              {activeBatchId
                ? t("assistant.workingOn", { batchId: activeBatchId })
                : isSimpleMode
                  ? t("assistant.noBatchSelected")
                  : t("assistant.noBatchPinned")}
            </p>
            <p className="mt-2 text-xs text-black/50">
              {isSimpleMode
                ? languages.find((option) => option.value === language)?.nativeLabel
                : getReadableActionLabel(lastAction, t("assistant.waitingResponse"), t)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/10 bg-black/[0.03] p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-black">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-black">
                    {isSimpleMode ? t("assistant.assistantReady") : t("assistant.interpreterReady")}
                  </p>
                  <p className="text-sm leading-7 text-black/65">
                    {isSimpleMode
                      ? t("assistant.readyDescriptionSimple")
                      : t("assistant.readyDescriptionFull")}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => applyPrompt(prompt)}
                    className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/75 transition duration-300 hover:border-black/25 hover:bg-black/[0.03] hover:text-black"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </AnimatePresence>

          {isLoading ? (
            <motion.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3 text-black/65">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-black">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("assistant.waitingResponse")}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submitQuery} className="mt-6 space-y-4 border-t border-black/10 pt-5">
          {activeFollowUpQuestion ? (
            <div className="rounded-[24px] border border-finca-gold/20 bg-finca-gold/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-black/45">{t("assistant.followUpNeeded")}</p>
              <p className="mt-2 text-sm leading-7 text-black/72">{activeFollowUpQuestion}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedPrompts.slice(0, 2).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => applyPrompt(prompt)}
                    className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/75 transition duration-300 hover:border-black/25 hover:bg-black/[0.03] hover:text-black"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className={cn("grid gap-4", isSimpleMode ? "lg:grid-cols-[1fr_180px_180px]" : "lg:grid-cols-[1fr_170px_150px_150px]")}>
            <label className="space-y-2">
              <span className="text-sm font-medium text-black/80">{t("assistant.batchContext")}</span>
              <input
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
                className="input-shell"
                placeholder={t("assistant.batchContextPlaceholder")}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-black/80">{isSimpleMode ? t("assistant.languageAndMic") : t("assistant.language")}</span>
              <select value={language} onChange={(event) => setLanguagePreference(event.target.value as typeof language)} className="input-shell">
                {languages.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.nativeLabel}
                  </option>
                ))}
              </select>
            </label>

            {!isSimpleMode ? (
              <label className="space-y-2">
                <span className="text-sm font-medium text-black/80">{t("assistant.style")}</span>
                <select
                  value={responseStyle}
                  onChange={(event) => setResponseStyle(event.target.value as AIResponseStyle)}
                  className="input-shell"
                >
                  <option value="brief">{t("assistant.brief")}</option>
                  <option value="balanced">{t("assistant.balanced")}</option>
                  <option value="detailed">{t("assistant.detailed")}</option>
                </select>
              </label>
            ) : null}

            <label className="space-y-2">
              <span className="text-sm font-medium text-black/80">{isSimpleMode ? t("assistant.audioReply") : t("assistant.voice")}</span>
              <button
                type="button"
                onClick={() => setVoiceEnabled((current) => !current)}
                className={cn(
                  "input-shell inline-flex items-center justify-between",
                  voiceEnabled && "border-black/20 bg-black/[0.05]"
                )}
              >
                <span>{voiceEnabled ? t("assistant.audioOn") : t("assistant.audioOff")}</span>
                <Volume2 className="h-4 w-4" />
              </button>
            </label>
          </div>

          <div className="flex gap-3">
            <textarea
              ref={queryRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-shell min-h-[108px] flex-1 resize-y"
              placeholder={queryPlaceholder}
            />
            <div className="flex min-w-[148px] flex-col gap-3">
              <button
                type="button"
                disabled={!speechSupported}
                onClick={() => {
                  if (isListening) {
                    stopListening();
                    return;
                  }

                  startListening();
                }}
                className={cn(
                  "button-secondary h-full min-h-[52px] gap-2 disabled:cursor-not-allowed disabled:opacity-50",
                  isListening && "border-finca-mint/35 bg-finca-mint/10 text-black"
                )}
              >
                {isListening ? t("assistant.stopMic") : t("assistant.speak")}
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="button-primary h-full min-h-[52px] gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? t("assistant.sending") : t("assistant.send")}
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {speechError ? (
            <div className="rounded-2xl border border-finca-gold/20 bg-finca-gold/10 p-4 text-sm text-black/75">
              {speechError}
            </div>
          ) : null}

          <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black/68">
            {t("assistant.speechHint")}
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => applyPrompt(prompt)}
                className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2 text-sm text-black/75 transition duration-300 hover:border-black/25 hover:bg-white hover:text-black"
              >
                {prompt}
              </button>
            ))}
          </div>
        </form>
      </div>

      {!isSimpleMode ? (
        <div className="space-y-6">
        <div className="glass-panel p-6 lg:p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("assistant.assistantGuide")}</p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("assistant.currentBatch")}</p>
              <p className="mt-2 text-3xl font-semibold text-black">{activeBatchId ?? t("common.none")}</p>
              <p className="mt-2 text-sm text-black/65">
                {t("assistant.latestActionDesc")}
              </p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("assistant.latestAction")}</p>
              <p className="mt-2 text-lg font-semibold text-black">
                {getReadableActionLabel(lastAction, t("assistant.waitingResponse"), t)}
              </p>
              <p className="mt-2 text-sm leading-7 text-black/65">{t("assistant.latestActionDesc")}</p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("assistant.speechToText")}</p>
              <p className="mt-2 text-lg font-semibold text-black">
                {speechSupported ? (isListening ? t("assistant.listeningNow") : t("assistant.micReady")) : t("assistant.browserNotSupported")}
              </p>
              <p className="mt-2 text-sm leading-7 text-black/65">{t("assistant.speechDesc")}</p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-black/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("assistant.replyMode")}</p>
              <p className="mt-2 text-lg font-semibold text-black">
                {toTitleCase(responseStyle)} · {voiceEnabled ? t("assistant.audioOn") : t("assistant.audioOff")}
              </p>
              <p className="mt-2 text-sm leading-7 text-black/65">{t("assistant.replyModeDesc")}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 lg:p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("assistant.suggestedNextAsks")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => applyPrompt(prompt)}
                className="rounded-full border border-black/10 bg-black/[0.03] px-4 py-2 text-sm text-black/75 transition duration-300 hover:border-black/25 hover:bg-white hover:text-black"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {validationResult ? (
          <div
            className={cn(
              "glass-panel p-6 lg:p-8",
              validationFlag === true && "border-finca-emerald/35 shadow-glow",
              validationFlag === false && "border-finca-ember/35 shadow-glow-red"
            )}
          >
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("assistant.verificationResult")}</p>
              <h2 className="text-2xl font-semibold text-black">
                {validationFlag === true
                  ? t("validation.verified")
                  : validationFlag === false
                    ? t("validation.compromised")
                    : t("assistant.verificationResult")}
              </h2>
              <p className="text-sm leading-7 text-black/68">{t("assistant.verificationResultDesc")}</p>
            </div>

            <div className="mt-5 grid gap-3">
              {validationEntries.map(([key, value]) => (
                <div key={key} className="rounded-[22px] border border-black/10 bg-black/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-black/45">{key.replace(/_/g, " ")}</p>
                  <p className="mt-2 break-words text-sm leading-7 text-black/75">
                    {renderValue(value, t("common.notProvided"))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {actionError ? (
          <div className="glass-panel border-finca-ember/30 p-6 lg:p-8">
            <p className="text-sm uppercase tracking-[0.28em] text-finca-ember">{t("assistant.interpreterError")}</p>
            <p className="mt-3 text-sm leading-7 text-black/72">{actionError}</p>
          </div>
        ) : null}

        {(lastResponse?.router_plan || lastResponse?.warnings?.length) ? (
          <div className="glass-panel p-6 lg:p-8">
            <button
              type="button"
              onClick={() => setShowDebug((current) => !current)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm uppercase tracking-[0.28em] text-finca-gold">{t("assistant.debugDetails")}</span>
              <span className="text-xs text-black/50">{showDebug ? t("common.hide") : t("common.show")}</span>
            </button>

            {showDebug ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-[22px] border border-black/10 bg-black/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-black/45">{t("assistant.session")}</p>
                  <p className="mt-2 break-all text-sm leading-7 text-black/75">{sessionId}</p>
                </div>

                {lastResponse?.router_plan ? (
                  <div className="grid gap-3">
                    {Object.entries(lastResponse.router_plan).map(([key, value]) => (
                      <div key={key} className="rounded-[22px] border border-black/10 bg-black/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-black/45">{key.replace(/_/g, " ")}</p>
                        <p className="mt-2 break-words text-sm leading-7 text-black/75">
                          {renderValue(value, t("common.notProvided"))}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {lastResponse?.warnings?.length ? (
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-black/45">{t("assistant.warnings")}</p>
                    {lastResponse.warnings.map((warning, index) => (
                      <div
                        key={`${warning}-${index}`}
                        className="rounded-[22px] border border-finca-gold/20 bg-finca-gold/10 p-4"
                      >
                        <p className="text-sm leading-7 text-black/72">{warning}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Bot, User2 } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { VoicePlayer } from "@/components/VoicePlayer";
import { cn } from "@/lib/utils";
import type { AIChatMessage } from "@/lib/types";

interface ChatMessageProps {
  message: AIChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { t } = useLanguage();
  const assistant = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", assistant ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-3xl space-y-3 rounded-[28px] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]",
          assistant ? "border-black/10 bg-white text-black" : "border-black bg-black text-white"
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl border",
              assistant ? "border-black/10 bg-black/[0.03] text-black" : "border-white/15 bg-white/10 text-white"
            )}
          >
            {assistant ? <Bot className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
          </span>
          <div>
            <p className={cn("text-sm font-semibold", assistant ? "text-black" : "text-white")}>
              {assistant ? t("chatMessage.assistantName") : t("chatMessage.you")}
            </p>
            {assistant && message.response?.intent ? (
              <p className="text-xs uppercase tracking-[0.22em] text-black/45">{message.response.intent}</p>
            ) : null}
          </div>
        </div>

        <p className={cn("text-sm leading-7", assistant ? "text-black/75" : "text-white/85")}>
          {message.content}
        </p>

        {assistant && message.response ? (
          <div className="flex flex-wrap gap-2">
            {message.response.ui_action ? (
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-black/55">
                {message.response.ui_action}
              </span>
            ) : null}
            {typeof message.response.confidence === "number" ? (
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-black/55">
                {t("chatMessage.confidence", { value: Math.round(message.response.confidence * 100) })}
              </span>
            ) : null}
            {message.response.requires_user_action ? (
              <span className="rounded-full border border-finca-gold/20 bg-finca-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-black/65">
                {t("chatMessage.userActionNeeded")}
              </span>
            ) : null}
          </div>
        ) : null}

        {assistant && message.response?.follow_up_question ? (
          <div className="rounded-[22px] border border-finca-gold/20 bg-finca-gold/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-black/45">{t("assistant.followUpNeeded")}</p>
            <p className="mt-2 text-sm leading-7 text-black/72">{message.response.follow_up_question}</p>
          </div>
        ) : null}

        {assistant && message.audioUrl ? (
          <VoicePlayer src={message.audioUrl} autoplay={Boolean(message.autoplayAudio)} />
        ) : null}
      </div>
    </motion.div>
  );
}

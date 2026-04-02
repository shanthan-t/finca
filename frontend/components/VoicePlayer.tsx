"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface VoicePlayerProps {
  src: string;
  autoplay?: boolean;
}

export function VoicePlayer({ src, autoplay = false }: VoicePlayerProps) {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayedForSource = useRef<string | null>(null);
  const progressId = useId();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    audio.load();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (!autoplay) {
      autoPlayedForSource.current = null;
      return;
    }

    if (autoPlayedForSource.current === src) {
      return;
    }

    const startPlayback = async () => {
      try {
        await audio.play();
        autoPlayedForSource.current = src;
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    };

    void startPlayback();
  }, [autoplay, src]);

  const progress = useMemo(() => {
    if (!duration) {
      return 0;
    }

    return Math.min((currentTime / duration) * 100, 100);
  }, [currentTime, duration]);

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }

      return;
    }

    audio.pause();
    setIsPlaying(false);
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;

    if (!audio || !duration) {
      return;
    }

    const nextTime = (value / 100) * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div className="rounded-[22px] border border-black/10 bg-black/[0.03] p-4">
      <audio ref={audioRef} preload="metadata" src={src} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void togglePlayback();
          }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-black transition duration-300 hover:border-black/25 hover:bg-black/[0.03]"
          aria-label={isPlaying ? t("voicePlayer.pause") : t("voicePlayer.play")}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-black/45">
              <Volume2 className="h-3.5 w-3.5" />
              {t("voicePlayer.voiceResponse")}
            </div>
            <p className="text-xs text-black/55">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </p>
          </div>

          <label htmlFor={progressId} className="sr-only">
            {t("voicePlayer.progress")}
          </label>
          <input
            id={progressId}
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(event) => handleSeek(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-black/10 accent-black"
          />
        </div>
      </div>
    </div>
  );
}

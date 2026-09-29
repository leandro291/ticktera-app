"use client";

import { useState } from "react";
import { CheckIcon, HeartIcon, Share2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventActionsProps {
  title: string;
  /** `hero`: outlined buttons over the dark hero (desktop). `bar`: plain icons in the mobile top bar. */
  variant: "hero" | "bar";
}

export function EventActions({ title, variant }: EventActionsProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const button =
    variant === "hero"
      ? "flex size-[54px] items-center justify-center rounded-2xl border-[1.5px] border-white/40 text-white hover:bg-white/10"
      : "flex size-11 items-center justify-center rounded-xl text-foreground hover:bg-muted";

  return (
    <>
      <button
        type="button"
        aria-label="Guardar evento"
        aria-pressed={saved}
        onClick={() => setSaved((s) => !s)}
        className={cn(button, saved && (variant === "hero" ? "bg-white/15" : "text-[#be123c]"))}
      >
        <HeartIcon className="size-5" fill={saved ? "currentColor" : "none"} aria-hidden />
      </button>
      <button type="button" aria-label={copied ? "Enlace copiado" : "Compartir evento"} onClick={share} className={button}>
        {copied ? <CheckIcon className="size-5" aria-hidden /> : <Share2Icon className="size-5" aria-hidden />}
      </button>
    </>
  );
}

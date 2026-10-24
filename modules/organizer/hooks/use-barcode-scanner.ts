"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";

// lib.dom de TS no trae BarcodeDetector: tipo mínimo local.
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

const REPEAT_IGNORE_MS = 3000;

function getDetectorCtor(): BarcodeDetectorCtor | undefined {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

const noopSubscribe = () => () => {};
const getSupported = () =>
  typeof window !== "undefined" &&
  !!getDetectorCtor() &&
  !!navigator.mediaDevices?.getUserMedia;

export function useBarcodeScanner(opts: {
  enabled: boolean;
  onDetect: (value: string) => void;
}): { supported: boolean; videoRef: RefObject<HTMLVideoElement | null>; error: string | null } {
  const { enabled } = opts;
  const supported = useSyncExternalStore(noopSubscribe, getSupported, () => false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectRef = useRef(opts.onDetect);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectRef.current = opts.onDetect;
  });

  useEffect(() => {
    const Detector = getDetectorCtor();
    if (!enabled || !supported || !Detector) return;

    let cancelled = false;
    let frame = 0;
    let stream: MediaStream | null = null;
    let attached: HTMLVideoElement | null = null;
    let last = { value: "", at: 0 };
    const detector = new Detector({ formats: ["qr_code"] });

    const tick = async () => {
      const video = videoRef.current;
      if (cancelled || !video) return;
      if (video.readyState >= 2) {
        try {
          const [hit] = await detector.detect(video);
          const now = Date.now();
          if (!cancelled && hit?.rawValue) {
            const isRepeat = hit.rawValue === last.value && now - last.at < REPEAT_IGNORE_MS;
            if (!isRepeat) {
              last = { value: hit.rawValue, at: now };
              onDetectRef.current(hit.rawValue);
            }
          }
        } catch {
          // frame ilegible: se reintenta en el siguiente
        }
      }
      if (!cancelled) frame = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        setError(null);
        const video = videoRef.current;
        if (!video) return;
        attached = video;
        video.srcObject = s;
        await video.play().catch(() => {});
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo acceder a la cámara. Usa el ingreso manual.");
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
      if (attached) attached.srcObject = null;
    };
  }, [enabled, supported]);

  return { supported, videoRef, error };
}

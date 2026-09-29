"use client";

import { useEffect, useState } from "react";

/** Seconds left from `initialSeconds`, ticking once per second until 0. */
export function useCountdown(initialSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) clearInterval(timer);
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return secondsLeft;
}

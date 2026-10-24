/**
 * Limitador de intentos fallidos por clave, en memoria (ventana deslizante).
 * ponytail: por proceso; con varias instancias o reinicios el contador se pierde. Pasar a BD/Redis si eso importa.
 */
export function createAttemptLimiter(opts: { max: number; windowMs: number; now?: () => number }) {
  const now = opts.now ?? Date.now;
  const failures = new Map<string, number[]>();

  const recent = (key: string): number[] => {
    const since = now() - opts.windowMs;
    const live = (failures.get(key) ?? []).filter((t) => t > since);
    if (live.length) failures.set(key, live);
    else failures.delete(key);
    return live;
  };

  return {
    isBlocked: (key: string): boolean => recent(key).length >= opts.max,
    recordFailure(key: string): void {
      failures.set(key, [...recent(key), now()]);
    },
  };
}

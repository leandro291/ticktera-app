const digits = (value: string) => value.replace(/\D/g, "");

/** "4111111111111111" → "4111 1111 1111 1111" (max 19 digits). */
export const formatCardNumber = (value: string) =>
  digits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

/** "1228" → "12/28". */
export function formatExpiry(value: string) {
  const d = digits(value).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** "00:59" style countdown label. */
export const formatCountdown = (seconds: number) => {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

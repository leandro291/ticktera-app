import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckInResult as Result } from "../types/check-in";

/** Resultado grande: verde (evento + tipo + titular) o rojo (mensaje fijo por código). */
export function CheckInResult({ result }: { result: Result }) {
  const Icon = result.ok ? CircleCheckIcon : CircleAlertIcon;
  return (
    <div
      role={result.ok ? "status" : "alert"}
      className={cn(
        "flex flex-col items-center gap-2 rounded-[20px] border px-6 py-8 text-center",
        result.ok
          ? "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-12" aria-hidden />
      {result.ok ? (
        <>
          <p className="text-2xl font-semibold">Entrada válida</p>
          <p className="text-base font-medium">{result.ticket.eventTitle}</p>
          <p className="text-sm">
            {result.ticket.tierName} · {result.ticket.holderName}
          </p>
        </>
      ) : (
        <p className="text-xl font-semibold">{result.error}</p>
      )}
    </div>
  );
}

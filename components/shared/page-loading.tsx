import { LoaderCircleIcon } from "lucide-react";

/** Placeholder while saved data loads from the browser (avoids flashing an empty state). */
export function PageLoading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-1 items-center justify-center gap-2 px-4 py-20 text-sm text-muted-foreground">
      <LoaderCircleIcon className="size-5 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

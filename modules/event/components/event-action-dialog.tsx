"use client";

import { useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEventMutations } from "../hooks/use-event-mutations";
import { getActionCopy, type ConfirmableAction } from "../lib/event-action-copy";
import type { ManagedEventItem } from "../types/event-list";
import type { EventActionResult } from "../types/event-write";

interface EventActionDialogProps {
  event: (Pick<ManagedEventItem, "id" | "title"> & { sold: number }) | null;
  action: ConfirmableAction | null;
  mode: "owner" | "moderator";
  onOpenChange: (open: boolean) => void;
  onDone: (notice: string) => void;
}

/** Confirmación de cancelar, eliminar o suspender. Un error del servidor se muestra dentro y el diálogo queda abierto. */
export function EventActionDialog({ event, action, mode, onOpenChange, onDone }: EventActionDialogProps) {
  const { transition, moderate, remove, isPending } = useEventMutations();
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const copy = event && action ? getActionCopy(action, event) : null;

  const handleOpenChange = (open: boolean) => {
    if (isPending) return;
    if (!open) setError(null);
    onOpenChange(open);
  };

  const confirm = async () => {
    if (!event || !action) return;
    setError(null);
    let result: EventActionResult;
    try {
      if (action === "delete") result = await remove(event.id);
      else if (mode === "moderator") result = await moderate({ id: event.id, action });
      else if (action === "cancel") result = await transition({ id: event.id, action });
      else return;
    } catch {
      return setError("No se pudo completar la operación. Reintenta.");
    }
    if (result.ok) onDone(result.notice);
    else setError(result.error);
  };

  return (
    <AlertDialog open={copy !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent initialFocus={cancelRef}>
        <AlertDialogHeader>
          <AlertDialogMedia className="size-11 rounded-full bg-red-100 text-red-700">
            <TriangleAlert aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} disabled={isPending} className="h-11">
            Volver
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={isPending}
            className="h-11 bg-red-700 text-white hover:bg-red-800"
          >
            {isPending ? "Procesando…" : copy?.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

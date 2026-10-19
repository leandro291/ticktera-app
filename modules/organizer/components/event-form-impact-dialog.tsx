"use client";

import { useRef } from "react";
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

interface EventFormImpactDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** D6/AC25: confirmación explícita antes de cambiar fecha, hora o lugar de un evento con ventas. */
export function EventFormImpactDialog({ open, onConfirm, onCancel }: EventFormImpactDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent initialFocus={cancelRef}>
        <AlertDialogHeader>
          <AlertDialogMedia className="size-11 rounded-full bg-amber-100 text-amber-700">
            <TriangleAlert aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Ya hay entradas vendidas o reservadas</AlertDialogTitle>
          <AlertDialogDescription>
            Cambiar la fecha, la hora o el lugar afecta a quienes ya compraron, y hoy no les avisamos automáticamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} className="h-11">
            Volver
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="h-11">
            Guardar igual
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

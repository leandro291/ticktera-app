"use client";

import { useRef, useState, useTransition } from "react";
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
import { deleteUserAction } from "../actions/user-admin-actions";
import type { UserListItem } from "../types/user-list-item";

type Props = {
  user: UserListItem | null;
  onOpenChange: (open: boolean) => void;
  onDone: (notice: string) => void;
};

export function DeleteUserDialog({ user, onOpenChange, onDone }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  function handleOpenChange(open: boolean) {
    if (pending) return;
    if (!open) setError(null);
    onOpenChange(open);
  }

  function confirm() {
    if (!user) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUserAction({ userId: user.id });
      if (result.ok) onDone(result.notice);
      else setError(result.error);
    });
  }

  return (
    <AlertDialog open={user !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent initialFocus={cancelRef}>
        <AlertDialogHeader>
          <AlertDialogMedia className="size-11 rounded-full bg-red-100 text-red-700">
            <TriangleAlert aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>¿Eliminar a {user?.fullName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Perderá el acceso a Ticketera. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} disabled={pending} className="h-11">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={pending}
            className="h-11 bg-red-700 text-white hover:bg-red-800"
          >
            {pending ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

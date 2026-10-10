"use client";

import { CircleCheck, Lock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLockReason } from "../lib/user-list";
import type { UserListItem } from "../types/user-list-item";

type Props = {
  user: UserListItem;
  currentUserId: string;
  variant: "icons" | "compact";
  onToggle: (user: UserListItem) => void;
  onEdit: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
  pendingId?: string;
};

const DANGER = "text-red-700 hover:bg-red-100 hover:text-red-800";

export function UserRowActions({
  user,
  currentUserId,
  variant,
  onToggle,
  onEdit,
  onDelete,
  pendingId,
}: Props) {
  const lockReason = getLockReason(user, currentUserId);
  const disabled = pendingId === user.id;
  const editLabel = `Editar a ${user.fullName}`;
  const deleteLabel = `Eliminar a ${user.fullName}`;

  if (lockReason) {
    return (
      <span
        title={lockReason}
        className={
          variant === "compact"
            ? "flex min-h-11 flex-1 items-center gap-1.5 text-[13px] text-gray-600"
            : "inline-flex items-center gap-1.5 pr-3 text-xs text-gray-600"
        }
      >
        <Lock aria-hidden="true" className="size-4" />
        {lockReason}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-xl"
          disabled={disabled}
          onClick={() => onEdit(user)}
          aria-label={editLabel}
        >
          <Pencil aria-hidden="true" />
          Editar
        </Button>
        <Button
          type="button"
          variant="outline"
          className={`size-11 rounded-xl ${DANGER}`}
          disabled={disabled}
          onClick={() => onDelete(user)}
          aria-label={deleteLabel}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </>
    );
  }

  const toggleLabel =
    user.status === "active" ? `Suspender a ${user.fullName}` : `Aprobar a ${user.fullName}`;

  return (
    <div className="flex items-center justify-end gap-1">
      {user.role === "organizer" && (
        <Button
          type="button"
          variant="ghost"
          className="size-11 rounded-xl"
          disabled={disabled}
          onClick={() => onToggle(user)}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <CircleCheck aria-hidden="true" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        className="size-11 rounded-xl"
        disabled={disabled}
        onClick={() => onEdit(user)}
        aria-label={editLabel}
        title="Editar"
      >
        <Pencil aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={`size-11 rounded-xl ${DANGER}`}
        disabled={disabled}
        onClick={() => onDelete(user)}
        aria-label={deleteLabel}
        title="Eliminar"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}

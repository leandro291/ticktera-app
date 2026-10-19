"use client";

import { useState } from "react";
import Link from "next/link";
import { EllipsisVerticalIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { allowedActions, EventActionDialog, useEventMutations, type ManagedEventItem, type TransitionAction } from "@/modules/event";
import { EventSalesSheet } from "./event-sales-sheet";

export type RowNotice = { text: string; kind: "success" | "error" };

interface EventRowActionsProps {
  event: ManagedEventItem;
  onNotice: (notice: RowNotice) => void;
  triggerClassName: string;
}

/** AC26: Editar, Ver ventas y un menú con lo que permite el estado del evento (dueño, no moderador). */
export function EventRowActions({ event, onNotice, triggerClassName }: EventRowActionsProps) {
  const { transition, isPending } = useEventMutations();
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const actions = allowedActions(event.status, { owner: true, moderator: false });
  const sold = event.sales.sold;

  const run = async (action: TransitionAction) => {
    try {
      const result = await transition({ id: event.id, action });
      onNotice(result.ok ? { text: result.notice, kind: "success" } : { text: result.error, kind: "error" });
    } catch {
      onNotice({ text: "No se pudo completar la operación. Reintenta.", kind: "error" });
    }
  };

  const items = [
    actions.includes("publish") && { label: "Publicar", onClick: () => run("publish") },
    actions.includes("unpublish") && sold === 0 && { label: "Despublicar", onClick: () => run("unpublish") },
    actions.includes("cancel") && { label: "Cancelar evento", onClick: () => setConfirm("cancel"), destructive: true },
    actions.includes("delete") && sold === 0 && { label: "Eliminar", onClick: () => setConfirm("delete"), destructive: true },
  ].filter((item) => item !== false);

  return (
    <div className="flex items-center gap-2 lg:justify-end">
      {actions.includes("edit") && (
        <Link href={`/organizer/events/${event.id}/edit`} className={cn(triggerClassName, "grow lg:grow-0")}>
          Editar
        </Link>
      )}
      {event.status !== "draft" && <EventSalesSheet event={event} triggerClassName={cn(triggerClassName, "grow bg-transparent lg:grow-0")} />}
      {items.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Más acciones para ${event.title}`}
            disabled={isPending}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8 lg:rounded-lg"
          >
            <EllipsisVerticalIcon className="size-[18px]" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {items.map((item) => (
              <DropdownMenuItem key={item.label} onClick={item.onClick} variant={item.destructive ? "destructive" : "default"} className="min-h-11 lg:min-h-8">
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <EventActionDialog
        event={confirm ? { id: event.id, title: event.title, sold } : null}
        action={confirm}
        mode="owner"
        onOpenChange={(open) => !open && setConfirm(null)}
        onDone={(text) => {
          setConfirm(null);
          onNotice({ text, kind: "success" });
        }}
      />
    </div>
  );
}

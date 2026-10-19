"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEventAction, moderateEventAction, saveEventAction, transitionEventAction } from "../actions/event-actions";
import type { EventActionResult, ModerationAction, SaveEventInput, TransitionAction } from "../types/event-write";

/** Una mutación por acción; tras un éxito se invalida el prefijo ["events"] (todos los alcances). */
export function useEventMutations() {
  const queryClient = useQueryClient();
  const onSuccess = (result: EventActionResult) => {
    if (result.ok) return queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const save = useMutation({ mutationFn: (input: SaveEventInput) => saveEventAction(input), onSuccess });
  const transition = useMutation({
    mutationFn: (i: { id: string; action: TransitionAction }) => transitionEventAction(i),
    onSuccess,
  });
  const moderate = useMutation({
    mutationFn: (i: { id: string; action: ModerationAction }) => moderateEventAction(i),
    onSuccess,
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteEventAction({ id }), onSuccess });

  return {
    save: save.mutateAsync,
    transition: transition.mutateAsync,
    moderate: moderate.mutateAsync,
    remove: remove.mutateAsync,
    isPending: save.isPending || transition.isPending || moderate.isPending || remove.isPending,
  };
}

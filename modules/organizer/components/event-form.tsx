"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageLoading } from "@/components/shared/page-loading";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { cn } from "@/lib/utils";
import { EVENT_CATEGORIES, type EventCategory } from "@/modules/event";
import { buildOrganizerEvent, createEventDraft, createTierDraft, draftFromEvent } from "../lib/event-draft";
import { useOrganizerStore } from "../store/use-organizer-store";
import type { EventDraft, OrganizerEventStatus, TierDraft } from "../types/organizer-event";
import { EventFormCover } from "./event-form-cover";
import { EventFormPreview } from "./event-form-preview";
import { field, label, section } from "./event-form-styles";
import { EventFormTiers } from "./event-form-tiers";

const CATEGORY_ITEMS = EVENT_CATEGORIES.map((c) => ({ value: c, label: c }));

const button = "flex h-[52px] items-center justify-center rounded-[14px] px-3 text-[15px] font-semibold whitespace-nowrap lg:px-[22px]";

/** Create an event, or keep editing a draft when `draftId` matches one of the organizer's events. */
export function EventForm({ draftId }: { draftId?: string }) {
  const hydrated = useStoreHydrated(useOrganizerStore);
  // A draft is looked up once, so wait for the saved events before building the form state.
  if (draftId && !hydrated) return <PageLoading />;
  return <EventFormContent draftId={draftId} />;
}

function EventFormContent({ draftId }: { draftId?: string }) {
  const router = useRouter();
  const saveEvent = useOrganizerStore((s) => s.saveEvent);
  const editing = useOrganizerStore((s) => (draftId ? s.events.find((e) => e.id === draftId) : undefined));
  const [draft, setDraft] = useState<EventDraft>(() => (editing ? draftFromEvent(editing) : createEventDraft()));
  const titleRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setTiers = (update: (tiers: TierDraft[]) => TierDraft[]) => setDraft((d) => ({ ...d, tiers: update(d.tiers) }));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status: OrganizerEventStatus = submitter?.value === "draft" ? "draft" : "published";

    // A draft only needs a name; publishing runs the native `required` checks before we get here.
    const title = titleRef.current;
    if (status === "draft" && title && !draft.title.trim()) {
      title.setCustomValidity("Ponle un nombre para guardar el borrador.");
      title.reportValidity();
      return;
    }

    const id = editing?.id ?? `org-${Date.now().toString(36)}`;
    saveEvent(buildOrganizerEvent(draft, status, id, editing));
    router.push(`/organizer?saved=${status}`);
  };

  return (
    <main className="flex w-full max-w-[1176px] flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-12 lg:pt-8 lg:pb-12">
      <div className="flex flex-col gap-1 lg:gap-2.5">
        <Link
          href="/organizer#my-events"
          className="flex h-10 w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground lg:h-8"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Mis eventos
        </Link>
        <h1 className="text-[26px] leading-[1.15] font-bold tracking-tight lg:text-[32px]">{editing ? "Editar borrador" : "Crear evento"}</h1>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-8 lg:gap-y-5">
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:gap-5">
          <section className={section} aria-labelledby="basics-title">
            <h2 id="basics-title" className="text-[17px] font-semibold lg:text-lg">
              Información básica
            </h2>
            <label className={label}>
              Nombre del evento
              <Input
                ref={titleRef}
                name="title"
                required
                value={draft.title}
                onChange={(e) => {
                  e.target.setCustomValidity("");
                  set({ title: e.target.value });
                }}
                placeholder="Ej. Festival de verano 2026"
                className={field}
              />
            </label>
            <div className={label}>
              <span id="category-label">Categoría</span>
              <Select items={CATEGORY_ITEMS} value={draft.category} onValueChange={(value) => value && set({ category: value as EventCategory })}>
                <SelectTrigger aria-labelledby="category-label" className={cn(field, "w-full data-[size=default]:h-[52px]")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ITEMS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className={label}>
              Descripción
              <Textarea
                name="description"
                rows={4}
                value={draft.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Cuenta de qué trata el evento, quiénes se presentan y qué incluye la entrada."
                className="min-h-[120px] resize-y rounded-[14px] bg-background px-4 py-3.5 text-[15px] leading-normal md:text-[15px]"
              />
            </label>
          </section>

          <section className={section} aria-labelledby="when-title">
            <h2 id="when-title" className="text-[17px] font-semibold lg:text-lg">
              Fecha y lugar
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:gap-x-5 lg:gap-y-[18px]">
              <label className={label}>
                Fecha
                <Input type="date" name="date" required value={draft.date} onChange={(e) => set({ date: e.target.value })} className={cn(field, "px-3 lg:px-4")} />
              </label>
              <label className={label}>
                Hora de inicio
                <Input type="time" name="startTime" required value={draft.startTime} onChange={(e) => set({ startTime: e.target.value })} className={cn(field, "px-3 lg:px-4")} />
              </label>
              <label className={cn(label, "col-span-2 lg:col-span-1")}>
                Lugar
                <Input name="venue" required value={draft.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="Ej. Estadio Nacional" className={field} />
              </label>
              <label className={cn(label, "col-span-2 lg:col-span-1")}>
                Ciudad
                <Input name="city" required value={draft.city} onChange={(e) => set({ city: e.target.value })} placeholder="Ej. Lima" className={field} />
              </label>
            </div>
          </section>

          <EventFormCover image={draft.image} onChange={(image) => set({ image })} />

          <EventFormTiers
            tiers={draft.tiers}
            onChange={(id, patch) => setTiers((tiers) => tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)))}
            onAdd={() => setTiers((tiers) => [...tiers, createTierDraft()])}
            onRemove={(id) => setTiers((tiers) => (tiers.length > 1 ? tiers.filter((t) => t.id !== id) : tiers))}
          />
        </div>

        <EventFormPreview draft={draft} className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1" />

        <div className="sticky bottom-0 z-10 -mx-4 grid grid-cols-2 gap-2.5 border-t border-border bg-background px-4 pt-3 pb-5 shadow-[0_-12px_24px_-18px_rgba(24,24,27,.35)] lg:static lg:col-start-1 lg:mx-0 lg:flex lg:justify-end lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <button type="submit" name="intent" value="draft" formNoValidate className={cn(button, "border-[1.5px] border-input bg-background text-foreground hover:border-foreground")}>
            Guardar borrador
          </button>
          <button type="submit" name="intent" value="publish" className={cn(button, "bg-primary text-primary-foreground hover:bg-primary/90")}>
            <span className="lg:hidden">Publicar</span>
            <span className="hidden lg:inline">Publicar evento</span>
          </button>
        </div>
      </form>
    </main>
  );
}

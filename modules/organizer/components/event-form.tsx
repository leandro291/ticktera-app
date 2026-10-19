"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";
import { DatePicker } from "@/components/shared/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  checkPublishable,
  limaDateTimeToDate,
  publishIssuesToFieldErrors,
  saveEventSchema,
  useEventMutations,
  zodErrorToFieldErrors,
  type EventEditData,
} from "@/modules/event";
import { buildSaveInput, createEventDraft, createTierDraft, draftFromEditData } from "../lib/event-draft";
import type { EventDraft, TierDraft } from "../types/event-form";
import { EventFormCover } from "./event-form-cover";
import { EventFormImpactDialog } from "./event-form-impact-dialog";
import { EventFormPreview } from "./event-form-preview";
import { field, label, section } from "./event-form-styles";
import { EventFormTiers } from "./event-form-tiers";

type Intent = "draft" | "publish" | "save";
type FieldErrors = Record<string, string>;

const button = "flex h-[52px] items-center justify-center rounded-[14px] px-3 text-[15px] font-semibold whitespace-nowrap disabled:opacity-60 lg:px-[22px]";
const GENERIC_ERROR = "No se pudo completar la operación. Reintenta.";
const COVER_FAILED = "Guardamos el evento, pero no pudimos subir la portada. Súbela de nuevo.";

function FieldError({ name, errors }: { name: string; errors: FieldErrors }) {
  return errors[name] ? (
    <span id={`${name}-error`} className="text-[13px] font-medium text-destructive">
      {errors[name]}
    </span>
  ) : null;
}

const invalid = (name: string, errors: FieldErrors) =>
  errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {};

interface EventFormProps {
  categories: { id: string; name: string }[];
  /** Present when editing: the event as the server has it. */
  initial?: EventEditData;
  /** The event was saved but its cover upload failed (AC21). */
  coverFailed?: boolean;
}

/** Create or edit an event in the database (AC24). The cover uploads after saving, once the event has an id. */
export function EventForm({ categories, initial, coverFailed }: EventFormProps) {
  const router = useRouter();
  const { save } = useEventMutations();
  const [draft, setDraft] = useState<EventDraft>(() => (initial ? draftFromEditData(initial) : createEventDraft(categories[0]?.id ?? "")));
  // undefined = cover unchanged; null = remove it; otherwise the compressed JPEG and its preview URL.
  const [cover, setCover] = useState<{ blob: Blob; url: string } | null | undefined>(undefined);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summary, setSummary] = useState<string | null>(coverFailed ? COVER_FAILED : null);
  const [pending, setPending] = useState(false);
  const [confirmIntent, setConfirmIntent] = useState<Intent | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const editingPublished = initial?.status === "published";
  const noCategories = categories.length === 0;
  const previewUrl = cover === undefined ? (initial?.coverImageUrl ?? null) : (cover?.url ?? null);
  const categoryName = categories.find((c) => c.id === draft.categoryId)?.name ?? "Categoría";

  const set = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setTiers = (update: (tiers: TierDraft[]) => TierDraft[]) => setDraft((d) => ({ ...d, tiers: update(d.tiers) }));

  const changeCover = (blob: Blob | null) => {
    // ponytail: la última URL de vista previa se libera al cambiarla; al salir de la página la libera el navegador.
    if (cover) URL.revokeObjectURL(cover.url);
    setCover(blob ? { blob, url: URL.createObjectURL(blob) } : null);
  };

  const fail = (message: string, fieldErrors: FieldErrors = {}) => {
    setErrors(fieldErrors);
    setSummary(message);
    setPending(false);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  /** Uploads or removes the cover after saving. false = the event is saved but the cover isn't. */
  const syncCover = async (id: string): Promise<boolean> => {
    if (cover === undefined || (cover === null && !initial?.coverImageUrl)) return true;
    const url = `/api/events/${id}/cover`;
    if (cover === null) return (await fetch(url, { method: "DELETE" })).ok;
    const body = new FormData();
    body.append("file", cover.blob, "cover.jpg");
    return (await fetch(url, { method: "POST", body })).ok;
  };

  const submit = async (intent: Intent, acknowledgeBuyerImpact = false) => {
    const publish = intent === "publish";
    const input = buildSaveInput(draft, { id: initial?.id, expectedUpdatedAt: initial?.updatedAt, publish, acknowledgeBuyerImpact });

    // Same rules as the server, so most mistakes show up without a round trip.
    const parsed = saveEventSchema.safeParse(input);
    if (!parsed.success) return fail("Revisa los campos marcados.", zodErrorToFieldErrors(parsed.error));
    const dateChanged = !initial || draft.date !== initial.date || draft.startTime !== initial.startTime;
    if (publish || editingPublished) {
      const startsAt = limaDateTimeToDate(parsed.data.date, parsed.data.startTime)!;
      const issues = checkPublishable({ ...parsed.data, startsAt }, new Date(), { checkDate: publish || dateChanged });
      if (issues.length) return fail("Faltan datos para publicar. Revisa los campos marcados.", publishIssuesToFieldErrors(issues));
    }
    const placeChanged =
      dateChanged || draft.venueName !== initial?.venueName || draft.address !== initial?.address || draft.city !== initial?.city;
    if (initial?.hasSales && placeChanged && !acknowledgeBuyerImpact) return setConfirmIntent(intent);

    setPending(true);
    setSummary(null);
    try {
      const result = await save(input);
      if (!result.ok) return fail(result.error, result.fieldErrors);
      const id = result.id!;
      if (!(await syncCover(id))) return router.push(`/organizer/events/${id}/edit?cover=failed`);
      router.push(`/organizer?saved=${publish ? "published" : intent === "draft" ? "draft" : "updated"}`);
    } catch {
      fail(GENERIC_ERROR);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    submit((submitter?.value as Intent | undefined) ?? (editingPublished ? "save" : "draft"));
  };

  return (
    <main className="flex w-full max-w-[1176px] flex-col gap-4 px-4 pt-4 lg:gap-6 lg:px-12 lg:pt-8 lg:pb-12">
      <div className="flex flex-col gap-1 lg:gap-2.5">
        <Link
          href="/organizer"
          className="flex h-10 w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground lg:h-8"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Eventos
        </Link>
        <h1 className="text-[26px] leading-[1.15] font-bold tracking-tight lg:text-[32px]">
          {!initial ? "Crear evento" : editingPublished ? "Editar evento" : "Editar borrador"}
        </h1>
      </div>

      {summary && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive outline-none">
          {summary}
        </div>
      )}
      {noCategories && (
        <p role="status" className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Todavía no hay categorías cargadas, así que no se pueden guardar eventos. Corre el seed de la base de datos.
        </p>
      )}
      {initial?.hasSales && (
        <p role="status" className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Este evento ya tiene ventas. Algunos datos de las entradas están bloqueados para proteger a quienes compraron.
        </p>
      )}

      <form noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-8 lg:gap-y-5">
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:gap-5">
          <section className={section} aria-labelledby="basics-title">
            <h2 id="basics-title" className="text-[17px] font-semibold lg:text-lg">
              Información básica
            </h2>
            <label className={label}>
              Nombre del evento
              <Input
                name="title"
                value={draft.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Ej. Festival de verano 2026"
                className={field}
                {...invalid("title", errors)}
              />
              <FieldError name="title" errors={errors} />
            </label>
            <div className={label}>
              <span id="category-label">Categoría</span>
              <Select
                items={categories.map((c) => ({ value: c.id, label: c.name }))}
                value={draft.categoryId}
                onValueChange={(value) => value && set({ categoryId: value })}
              >
                <SelectTrigger aria-labelledby="category-label" className={cn(field, "w-full data-[size=default]:h-[52px]")} {...invalid("categoryId", errors)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError name="categoryId" errors={errors} />
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
                {...invalid("description", errors)}
              />
              <FieldError name="description" errors={errors} />
            </label>
          </section>

          <section className={section} aria-labelledby="when-title">
            <h2 id="when-title" className="text-[17px] font-semibold lg:text-lg">
              Fecha y lugar
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:gap-x-5 lg:gap-y-[18px]">
              <label className={label}>
                Fecha
                <DatePicker name="date" value={draft.date} onChange={(date) => set({ date })} className={cn(field, "px-3 lg:px-4")} />
                <FieldError name="date" errors={errors} />
              </label>
              <label className={label}>
                Hora de inicio
                <Input
                  type="time"
                  name="startTime"
                  value={draft.startTime}
                  onChange={(e) => set({ startTime: e.target.value })}
                  className={cn(field, "px-3 lg:px-4")}
                  {...invalid("startTime", errors)}
                />
                <FieldError name="startTime" errors={errors} />
              </label>
              <label className={cn(label, "col-span-2 lg:col-span-1")}>
                Lugar
                <Input
                  name="venueName"
                  value={draft.venueName}
                  onChange={(e) => set({ venueName: e.target.value })}
                  placeholder="Ej. Estadio Nacional"
                  className={field}
                  {...invalid("venueName", errors)}
                />
                <FieldError name="venueName" errors={errors} />
              </label>
              <label className={cn(label, "col-span-2 lg:col-span-1")}>
                Ciudad
                <Input
                  name="city"
                  value={draft.city}
                  onChange={(e) => set({ city: e.target.value })}
                  placeholder="Ej. Lima"
                  className={field}
                  {...invalid("city", errors)}
                />
                <FieldError name="city" errors={errors} />
              </label>
            </div>
          </section>

          <EventFormCover previewUrl={previewUrl} onChange={changeCover} />

          <EventFormTiers
            tiers={draft.tiers}
            errors={errors}
            onChange={(id, patch) => setTiers((tiers) => tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)))}
            onAdd={() => setTiers((tiers) => [...tiers, createTierDraft()])}
            onRemove={(id) => setTiers((tiers) => (tiers.length > 1 ? tiers.filter((t) => t.id !== id) : tiers))}
          />
        </div>

        <EventFormPreview
          draft={draft}
          categoryName={categoryName}
          imageUrl={previewUrl}
          className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />

        <div className="sticky bottom-0 z-10 -mx-4 grid grid-cols-2 gap-2.5 border-t border-border bg-background px-4 pt-3 pb-5 shadow-[0_-12px_24px_-18px_rgba(24,24,27,.35)] lg:static lg:col-start-1 lg:mx-0 lg:flex lg:justify-end lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          {editingPublished ? (
            <button type="submit" value="save" disabled={pending || noCategories} className={cn(button, "col-span-2 bg-primary text-primary-foreground hover:bg-primary/90")}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          ) : (
            <>
              <button
                type="submit"
                value="draft"
                disabled={pending || noCategories}
                className={cn(button, "border-[1.5px] border-input bg-background text-foreground hover:border-foreground")}
              >
                Guardar borrador
              </button>
              <button type="submit" value="publish" disabled={pending || noCategories} className={cn(button, "bg-primary text-primary-foreground hover:bg-primary/90")}>
                <span className="lg:hidden">Publicar</span>
                <span className="hidden lg:inline">Publicar evento</span>
              </button>
            </>
          )}
        </div>
      </form>

      <EventFormImpactDialog
        open={confirmIntent !== null}
        onCancel={() => setConfirmIntent(null)}
        onConfirm={() => {
          const intent = confirmIntent!;
          setConfirmIntent(null);
          submit(intent, true);
        }}
      />
    </main>
  );
}

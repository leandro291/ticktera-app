"use client";

import { useState } from "react";
import { ImageUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "../lib/image-compress";
import { section } from "./event-form-styles";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // AC22: tope de origen; lo que se sube es el JPEG comprimido

interface EventFormCoverProps {
  previewUrl: string | null;
  /** The compressed JPEG to upload after saving, or null to remove the cover. */
  onChange: (file: Blob | null) => void;
}

/** Cover upload (click or drag & drop). It's compressed in the browser and uploaded once the event is saved. */
export function EventFormCover({ previewUrl, onChange }: EventFormCoverProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError("Usa una imagen JPG, PNG o WebP.");
    if (file.size > MAX_SOURCE_BYTES) return setError("La imagen pesa más de 15 MB. Prueba con una más liviana.");
    setError(null);
    try {
      onChange(await compressImage(file));
    } catch {
      setError("No pudimos leer esa imagen. Prueba con otra.");
    }
  };

  return (
    <section className={section} aria-labelledby="cover-title">
      <h2 id="cover-title" className="text-[17px] font-semibold lg:text-lg">
        Imagen de portada
      </h2>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          "relative flex h-[150px] cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-[1.5px] border-dashed border-indigo-300 bg-[#F5F7FF] text-center text-indigo-700 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring lg:h-[180px] lg:gap-2 lg:rounded-[18px]",
          dragging && "border-primary bg-accent",
        )}
      >
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- object URL or Blob URL preview
          <img src={previewUrl} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <span className={cn("relative flex flex-col items-center gap-1.5 lg:gap-2", previewUrl && "rounded-2xl bg-background/90 px-4 py-3")}>
          <ImageUpIcon className="size-7" aria-hidden />
          <span className="text-[15px] font-semibold">
            {previewUrl ? "Cambiar imagen" : <><span className="lg:hidden">Subir imagen</span><span className="hidden lg:inline">Arrastra una imagen o haz clic para subirla</span></>}
          </span>
          <span className="text-xs text-muted-foreground lg:text-[13px]">JPG, PNG o WebP, horizontal (16:9)</span>
        </span>
        <input type="file" accept={ACCEPTED.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {previewUrl && (
        <button type="button" onClick={() => onChange(null)} className="w-fit text-sm font-semibold text-primary hover:underline">
          Quitar imagen
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

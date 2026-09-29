"use client";

import { useState } from "react";
import { ImageUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { section } from "./event-form-styles";

const ACCEPTED = ["image/jpeg", "image/png"];

interface EventFormCoverProps {
  image?: string;
  onChange: (image: string | undefined) => void;
}

/**
 * Cover upload (click or drag & drop). The file never leaves the browser: it is shown through an object URL
 * that lives as long as the session (no backend yet).
 */
export function EventFormCover({ image, onChange }: EventFormCoverProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Usa una imagen JPG o PNG.");
      return;
    }
    setError(null);
    onChange(URL.createObjectURL(file));
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
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
          <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <span className={cn("relative flex flex-col items-center gap-1.5 lg:gap-2", image && "rounded-2xl bg-background/90 px-4 py-3")}>
          <ImageUpIcon className="size-7" aria-hidden />
          <span className="text-[15px] font-semibold">
            {image ? "Cambiar imagen" : <><span className="lg:hidden">Subir imagen</span><span className="hidden lg:inline">Arrastra una imagen o haz clic para subirla</span></>}
          </span>
          <span className="text-xs text-muted-foreground lg:text-[13px]">JPG o PNG, horizontal (16:9)</span>
        </span>
        <input type="file" accept={ACCEPTED.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {image && (
        <button type="button" onClick={() => onChange(undefined)} className="w-fit text-sm font-semibold text-primary hover:underline">
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

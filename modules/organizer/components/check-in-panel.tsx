"use client";

import { useRef, useState } from "react";
import { CameraIcon, CameraOffIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkInTicketAction } from "../actions/check-in-actions";
import { useBarcodeScanner } from "../hooks/use-barcode-scanner";
import type { CheckInResult as Result } from "../types/check-in";
import { CheckInResult } from "./check-in-result";

export function CheckInPanel() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref síncrono: el hook no pausa durante la solicitud, así que onDetect se ignora aquí (AC13).
  const busyRef = useRef(false);

  async function submit(raw: string) {
    if (busyRef.current || !raw.trim()) return;
    busyRef.current = true;
    setPending(true);
    try {
      setResult(await checkInTicketAction({ code: raw }));
    } catch {
      setResult({ ok: false, error: "No se pudo validar. Reintenta." });
    } finally {
      busyRef.current = false;
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
      inputRef.current?.focus();
    }
  }

  const { supported, videoRef, error } = useBarcodeScanner({ enabled: cameraOn, onDetect: submit });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(inputRef.current?.value ?? "");
        }}
      >
        <Input
          ref={inputRef}
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label="Código de la entrada"
          placeholder="Código de la entrada"
          className="h-11 font-mono text-lg uppercase"
        />
        <Button type="submit" size="lg" className="h-11 px-5" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          Validar
        </Button>
      </form>

      {supported && (
        <Button type="button" variant="outline" size="lg" className="h-11 self-start" onClick={() => setCameraOn((v) => !v)}>
          {cameraOn ? <CameraOffIcon aria-hidden /> : <CameraIcon aria-hidden />}
          {cameraOn ? "Cerrar cámara" : "Escanear con cámara"}
        </Button>
      )}
      {cameraOn && (
        <>
          <video ref={videoRef} muted playsInline className="aspect-video w-full rounded-[20px] bg-black object-cover" />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </>
      )}

      {result && <CheckInResult result={result} />}
    </div>
  );
}

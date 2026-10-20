"use client";

import { Button } from "@/components/ui/button";

// Mensaje fijo: no se muestra ni se loguea `error` (puede traer datos de la orden).
export default function MyTicketsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <h1 className="text-xl font-bold">No pudimos cargar tus entradas</h1>
      <p className="text-sm text-muted-foreground">Ocurrió un problema inesperado. Intentá de nuevo en unos segundos.</p>
      <Button onClick={() => retry()} className="min-h-11">
        Reintentar
      </Button>
    </div>
  );
}

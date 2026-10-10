"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageWindow } from "../lib/user-list";

type UsersPaginationProps = {
  variant: "numbered" | "simple";
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export function UsersPagination({ variant, page, pageCount, onPageChange }: UsersPaginationProps) {
  const isFirst = page <= 1;
  const isLast = page >= pageCount;

  if (variant === "simple") {
    return (
      <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl px-4"
          disabled={isFirst}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {page} de {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl px-4"
          disabled={isLast}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </nav>
    );
  }

  return (
    <nav aria-label="Paginación" className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        className="size-11 rounded-xl"
        aria-label="Página anterior"
        disabled={isFirst}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      {pageWindow(page, pageCount).map((n) => (
        <Button
          key={n}
          type="button"
          variant={n === page ? "default" : "outline"}
          className="h-11 min-w-11 rounded-xl px-2"
          aria-label={`Página ${n}`}
          aria-current={n === page ? "page" : undefined}
          onClick={() => onPageChange(n)}
        >
          {n}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        className="size-11 rounded-xl"
        aria-label="Página siguiente"
        disabled={isLast}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}

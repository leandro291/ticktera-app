"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { es } from "react-day-picker/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** "yyyy-mm-dd" ⇄ Date local (sin pasar por UTC, para no correr el día). */
const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}
const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const display = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" })

interface DatePickerProps {
  value: string // "yyyy-mm-dd" o ""
  onChange: (value: string) => void
  placeholder?: string
  /** Límites inclusivos, "yyyy-mm-dd". */
  min?: string
  max?: string
  required?: boolean
  name?: string
  "aria-label"?: string
  "aria-labelledby"?: string
  className?: string
}

/** Fecha con el Calendar de shadcn. El alto lo define `className` (h-11 en filtros, h-[52px] en formularios). */
export function DatePicker({ value, onChange, placeholder = "Seleccionar fecha", min, max, required, name, className, ...aria }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger
          {...aria}
          className={cn(
            "flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-[15px] transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{value ? display.format(parse(value)) : placeholder}</span>
        </PopoverTrigger>
        {/* Valida `required` con el mensaje nativo, igual que un <input> normal. */}
        {(required || name) && (
          <input
            tabIndex={-1}
            aria-hidden
            name={name}
            required={required}
            value={value}
            onChange={() => {}}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
          />
        )}
      </div>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={es}
          selected={value ? parse(value) : undefined}
          defaultMonth={value ? parse(value) : undefined}
          disabled={[...(min ? [{ before: parse(min) }] : []), ...(max ? [{ after: parse(max) }] : [])]}
          onSelect={(date) => {
            onChange(date ? toIso(date) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

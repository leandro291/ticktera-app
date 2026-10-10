"use client"

import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Role } from "@/modules/auth"
import { hasActiveFilters, type UserListFilters } from "../lib/user-list"
import { ORGANIZER_STATUS_LABEL, ROLE_LABEL } from "../lib/user-labels"

type Props = {
  filters: UserListFilters
  onChange: (filters: UserListFilters) => void
  onClear: () => void
}

const ROLES = ["super_admin", "admin", "organizer", "customer"] as const satisfies readonly Role[]

const ROLE_ITEMS = [
  { value: "all", label: "Todos los roles" },
  ...ROLES.map((value) => ({ value, label: ROLE_LABEL[value] })),
]

const STATUS_ITEMS = [
  { value: "all", label: "Todos" },
  { value: "active", label: ORGANIZER_STATUS_LABEL.active },
  { value: "suspended", label: ORGANIZER_STATUS_LABEL.suspended },
]

// Etiquetas visibles en escritorio, solo para lectores de pantalla en móvil.
const labelClass = "mb-1.5 max-md:sr-only"
const triggerClass = "h-11 w-full text-[15px] data-[size=default]:h-11"

/** AC2: búsqueda, filtro de rol y de estado (solo organizadores). */
export function UsersFilters({ filters, onChange, onClear }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-[1_1_280px]">
        <Label htmlFor="users-q" className={labelClass}>
          Buscar
        </Label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="users-q"
            type="search"
            autoComplete="off"
            placeholder="Nombre o correo"
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            className="h-11 pl-10 text-[15px]"
          />
        </div>
      </div>

      <div className="min-w-[150px] flex-[0_1_200px] max-md:flex-1">
        <Label htmlFor="users-role" className={labelClass}>
          Rol
        </Label>
        <Select
          items={ROLE_ITEMS}
          value={filters.role}
          onValueChange={(v) => v && onChange({ ...filters, role: v as UserListFilters["role"] })}
        >
          <SelectTrigger id="users-role" className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[150px] flex-[0_1_200px] max-md:flex-1">
        <Label htmlFor="users-status" className={labelClass}>
          Estado de organizador
        </Label>
        <Select
          items={STATUS_ITEMS}
          value={filters.status}
          onValueChange={(v) => v && onChange({ ...filters, status: v as UserListFilters["status"] })}
        >
          <SelectTrigger id="users-status" className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters(filters) && (
        <Button type="button" variant="outline" className="h-11 gap-2 px-4" onClick={onClear}>
          <X aria-hidden />
          Limpiar
        </Button>
      )}
    </div>
  )
}

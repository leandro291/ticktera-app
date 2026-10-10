"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateUserAction } from "../actions/user-admin-actions"
import { EDIT_ROLES, ORGANIZER_STATUS_LABEL, ROLE_LABEL } from "../lib/user-labels"
import type { UserListItem } from "../types/user-list-item"

type EditRole = (typeof EDIT_ROLES)[number]
type Status = "active" | "suspended"

const ROLE_ITEMS = EDIT_ROLES.map((value) => ({ value, label: ROLE_LABEL[value] }))
const STATUS_ITEMS = (Object.keys(ORGANIZER_STATUS_LABEL) as Status[]).map((value) => ({
  value,
  label: ORGANIZER_STATUS_LABEL[value],
}))

const selectClass = "h-11 w-full text-[15px] data-[size=default]:h-11"

/** AC10-AC12: edición de nombre, rol y estado de organizador. Montar con `key={user.id}`: el estado nace de `user`. */
export function EditUserDialog({
  user,
  onOpenChange,
  onDone,
}: {
  user: UserListItem | null
  onOpenChange: (open: boolean) => void
  onDone: (notice: string) => void
}) {
  const [fullName, setFullName] = useState(user?.fullName ?? "")
  const [role, setRole] = useState<EditRole>((user?.role as EditRole | undefined) ?? "customer")
  const [status, setStatus] = useState<Status>(user?.status ?? "active")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setFieldErrors({})
    startTransition(async () => {
      const result = await updateUserAction({
        userId: user.id,
        fullName,
        role,
        status: role === "organizer" ? status : undefined,
      })
      if (result.ok) {
        onDone(result.notice)
        return
      }
      setError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
    })
  }

  const nameError = fieldErrors.fullName?.[0]
  // Con errores de campo, el general ("Datos inválidos.") es redundante.
  const showGeneral = error && Object.keys(fieldErrors).length === 0

  return (
    <Dialog open={user !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Editar usuario</DialogTitle>
            <DialogDescription className="sr-only">Cambiá el nombre, el rol o el estado de la cuenta.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-fullName">Nombre</Label>
            <Input
              id="edit-fullName"
              autoComplete="off"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "edit-fullName-error" : undefined}
              className="h-11 text-[15px]"
            />
            {nameError && (
              <p id="edit-fullName-error" role="alert" className="text-xs text-destructive">
                {nameError}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-email">Correo</Label>
            <Input
              id="edit-email"
              type="email"
              value={user?.email ?? ""}
              disabled
              aria-describedby="edit-email-hint"
              className="h-11 text-[15px]"
            />
            <p id="edit-email-hint" className="text-xs text-muted-foreground">
              El correo viene de la cuenta de Google y no se edita.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="grid flex-1 basis-36 gap-1.5">
              <Label htmlFor="edit-role">Rol</Label>
              <Select items={ROLE_ITEMS} value={role} onValueChange={(v) => v && setRole(v as EditRole)}>
                <SelectTrigger id="edit-role" className={selectClass}>
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

            {role === "organizer" && (
              <div className="grid flex-1 basis-36 gap-1.5">
                <Label htmlFor="edit-status">Estado de organizador</Label>
                <Select items={STATUS_ITEMS} value={status} onValueChange={(v) => v && setStatus(v as Status)}>
                  <SelectTrigger id="edit-status" className={selectClass}>
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
            )}
          </div>

          {showGeneral && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

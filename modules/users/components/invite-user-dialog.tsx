"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { inviteUserAction } from "../actions/user-admin-actions"
import { INVITE_ROLES, ROLE_LABEL } from "../lib/user-labels"

type InviteRole = (typeof INVITE_ROLES)[number]

const ROLE_ITEMS = INVITE_ROLES.map((value) => ({ value, label: ROLE_LABEL[value] }))

/** AC8, AC9, AC9b: invita por correo (Clerk) o cambia el rol de un correo existente. Controlado desde afuera. */
export function InviteUserDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (notice: string) => void
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<InviteRole>("organizer")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [pending, startTransition] = useTransition()

  function reset() {
    setEmail("")
    setRole("organizer")
    setError(null)
    setFieldErrors({})
  }

  function handleOpenChange(next: boolean) {
    if (pending) return
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    startTransition(async () => {
      const result = await inviteUserAction({ email, role })
      if (result.ok) {
        reset()
        onDone(result.notice)
        return
      }
      setError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
    })
  }

  const emailError = fieldErrors.email?.[0]
  const roleError = fieldErrors.role?.[0]
  // Con errores de campo el general repite lo mismo: se muestra solo sin campos.
  const showGeneral = error && Object.keys(fieldErrors).length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Invitar usuario</DialogTitle>
            <DialogDescription>
              Si el correo ya tiene cuenta, se cambia su rol. Si no, le enviamos una invitación por correo para crear su
              cuenta.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">Correo</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              required
              placeholder="persona@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "invite-email-error" : undefined}
              className="h-11 text-[15px]"
            />
            {emailError && (
              <p id="invite-email-error" className="text-xs text-destructive">
                {emailError}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="invite-role">Rol</Label>
            <Select items={ROLE_ITEMS} value={role} onValueChange={(v) => v && setRole(v as InviteRole)}>
              <SelectTrigger
                id="invite-role"
                aria-invalid={!!roleError}
                aria-describedby={roleError ? "invite-role-error" : undefined}
                className="h-11 w-full text-[15px] data-[size=default]:h-11"
              >
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
            {roleError && (
              <p id="invite-role-error" className="text-xs text-destructive">
                {roleError}
              </p>
            )}
          </div>

          {showGeneral && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="h-11" disabled={pending} />}>
              Cancelar
            </DialogClose>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? "Invitando…" : "Invitar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

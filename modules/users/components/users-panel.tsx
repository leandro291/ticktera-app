"use client";

import { useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import { setUserStatusAction } from "../actions/user-admin-actions";
import {
  EMPTY_FILTERS,
  MOBILE_PAGE_SIZE,
  PAGE_SIZES,
  filterUsers,
  paginate,
  type UserListFilters,
} from "../lib/user-list";
import type { UserListItem } from "../types/user-list-item";
import { DeleteUserDialog } from "./delete-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { InviteUserDialog } from "./invite-user-dialog";
import { UserCards } from "./user-cards";
import { UsersFilters } from "./users-filters";
import { UsersPagination } from "./users-pagination";
import { UsersTable } from "./users-table";

type Notice = { kind: "success" | "error"; text: string };

const PAGE_SIZE_ITEMS = PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }));

/** AC2, AC3, AC4, AC7: estado de la lista (filtros, página, aviso, diálogos); tabla en ≥ md, tarjetas en < md (D11). */
export function UsersPanel({ users, currentUserId }: { users: UserListItem[]; currentUserId: string }) {
  const [filters, setFilters] = useState<UserListFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState<UserListItem | null>(null);
  const [pendingId, setPendingId] = useState<string>();
  const [, startTransition] = useTransition();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const filtered = filterUsers(users, filters);
  const view = paginate(filtered, page, isDesktop ? pageSize : MOBILE_PAGE_SIZE);
  const isEmpty = view.total === 0;

  function changeFilters(next: UserListFilters) {
    setFilters(next);
    setPage(1);
  }

  function changePageSize(value: string | null) {
    if (!value) return;
    setPageSize(Number(value));
    setPage(1);
  }

  function done(text: string) {
    setNotice({ kind: "success", text });
    setInviteOpen(false);
    setEditing(null);
    setDeleting(null);
  }

  function toggle(user: UserListItem) {
    setPendingId(user.id);
    startTransition(async () => {
      const result = await setUserStatusAction({
        userId: user.id,
        status: user.status === "suspended" ? "active" : "suspended",
      });
      setNotice(result.ok ? { kind: "success", text: result.notice } : { kind: "error", text: result.error });
      setPendingId(undefined);
    });
  }

  const actions = {
    users: view.items,
    currentUserId,
    onToggle: toggle,
    onEdit: setEditing,
    onDelete: setDeleting,
    pendingId,
  };
  const clear = () => changeFilters(EMPTY_FILTERS);
  const rangeLabel = isEmpty ? "0 resultados" : `Mostrando ${view.from}–${view.to} de ${view.total}`;

  return (
    <div className="flex flex-col gap-5 max-md:gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-4 max-md:flex-nowrap max-md:gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight max-md:text-[22px]">Usuarios y roles</h1>
          <p className="mt-1 text-sm text-gray-600 max-md:mt-0.5 max-md:text-[13px]">
            {users.length} usuarios registrados
          </p>
        </div>
        <Button
          type="button"
          aria-label="Invitar usuario"
          className="h-11 gap-2 px-4 text-[15px]"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus aria-hidden="true" />
          Invitar<span className="max-md:hidden"> usuario</span>
        </Button>
      </div>

      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-3 rounded-xl py-1 pr-1 pl-4 text-sm font-medium ${
            notice.kind === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          <span>{notice.text}</span>
          <Button
            type="button"
            variant="ghost"
            className="size-11 shrink-0 rounded-xl"
            aria-label="Cerrar aviso"
            onClick={() => setNotice(null)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}

      <UsersFilters filters={filters} onChange={changeFilters} onClear={clear} />

      {isDesktop ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {!isEmpty && <UsersTable {...actions} />}
          {isEmpty && <EmptyState onClear={clear} />}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-5 py-3">
            <p className="text-[13px] text-gray-600">{rangeLabel}</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="users-page-size" className="text-[13px] font-normal text-gray-600">
                  Filas
                </Label>
                <Select items={PAGE_SIZE_ITEMS} value={String(pageSize)} onValueChange={changePageSize}>
                  <SelectTrigger id="users-page-size" className="h-11 w-24 text-[15px] data-[size=default]:h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <UsersPagination variant="numbered" page={view.page} pageCount={view.pageCount} onPageChange={setPage} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {isEmpty ? (
            <div className="rounded-2xl border border-border bg-card">
              <EmptyState onClear={clear} />
            </div>
          ) : (
            <UserCards {...actions} />
          )}
          <p className="text-center text-[13px] text-gray-600">{rangeLabel}</p>
          {!isEmpty && (
            <UsersPagination variant="simple" page={view.page} pageCount={view.pageCount} onPageChange={setPage} />
          )}
        </>
      )}

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onDone={done} />
      <EditUserDialog key={editing?.id} user={editing} onOpenChange={(o) => !o && setEditing(null)} onDone={done} />
      <DeleteUserDialog user={deleting} onOpenChange={(o) => !o && setDeleting(null)} onDone={done} />
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="mb-1 text-base font-semibold">Sin resultados</p>
      <p className="mb-4 text-sm text-gray-600">Ningún usuario coincide con los filtros.</p>
      <Button type="button" variant="outline" className="h-11 px-4" onClick={onClear}>
        Limpiar filtros
      </Button>
    </div>
  );
}

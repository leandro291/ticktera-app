"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { UserListItem } from "../types/user-list-item";
import { RoleBadge, StatusBadge, UserAvatar } from "./user-badges";
import { UserRowActions } from "./user-row-actions";

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeZone: "UTC" });

const HEAD = "h-11 bg-gray-50 px-5 text-xs font-semibold tracking-wider text-gray-600 uppercase";

type Props = {
  users: UserListItem[];
  currentUserId: string;
  onToggle: (user: UserListItem) => void;
  onEdit: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
  pendingId?: string;
};

/** AC1, AC4–AC6: tabla de solo lectura; las acciones salen por callbacks. */
export function UsersTable({ users, currentUserId, onToggle, onEdit, onDelete, pendingId }: Props) {
  return (
    <Table aria-label="Usuarios">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={HEAD}>Usuario</TableHead>
          <TableHead className={HEAD}>Rol</TableHead>
          <TableHead className={HEAD}>Organizador</TableHead>
          <TableHead className={HEAD}>Registro</TableHead>
          <TableHead className={cn(HEAD, "text-right")}>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="px-5 py-3">
              <div className="flex items-center gap-3">
                <UserAvatar name={u.fullName} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{u.fullName}</span>
                    {u.id === currentUserId && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        Tú
                      </span>
                    )}
                  </p>
                  <p className="max-w-64 truncate text-[13px] text-gray-600" title={u.email}>
                    {u.email}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-5">
              <RoleBadge role={u.role} />
            </TableCell>
            <TableCell className="px-5">
              {u.role === "organizer" && <StatusBadge status={u.status} />}
            </TableCell>
            <TableCell className="px-5 text-[13px] text-gray-600">{dateFormat.format(u.createdAt)}</TableCell>
            <TableCell className="px-5 text-right">
              <UserRowActions
                user={u}
                currentUserId={currentUserId}
                variant="icons"
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                pendingId={pendingId}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

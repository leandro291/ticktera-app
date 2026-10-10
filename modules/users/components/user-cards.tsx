import type { UserListItem } from "../types/user-list-item";
import { RoleBadge, StatusBadge, UserAvatar } from "./user-badges";
import { UserRowActions } from "./user-row-actions";

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeZone: "UTC" });

type Props = {
  users: UserListItem[];
  currentUserId: string;
  onToggle: (user: UserListItem) => void;
  onEdit: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
  pendingId?: string;
};

/** AC1, AC4, AC5, AC6: lista móvil (< md) de usuarios como tarjetas. */
export function UserCards({ users, currentUserId, onToggle, onEdit, onDelete, pendingId }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {users.map((user) => (
        <li
          key={user.id}
          className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={user.fullName} />
            <div className="min-w-0 leading-snug">
              <div className="truncate text-sm font-medium">
                {user.fullName}
                {user.id === currentUserId && " (tú)"}
              </div>
              <div className="truncate text-[13px] text-gray-600">{user.email}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={user.role} />
            {user.role === "organizer" && <StatusBadge status={user.status} />}
            <span className="ml-auto text-xs text-gray-600">
              {dateFormat.format(user.createdAt)}
            </span>
          </div>
          <div className="flex gap-2">
            <UserRowActions
              user={user}
              currentUserId={currentUserId}
              variant="compact"
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              pendingId={pendingId}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

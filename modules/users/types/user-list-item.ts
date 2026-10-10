import type { UserRow } from "@/modules/auth/server";

export type UserListItem = Pick<
  UserRow,
  "id" | "email" | "fullName" | "role" | "status" | "createdAt"
>;

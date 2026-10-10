// Server-only entry (touches pg and @clerk/backend). Client-safe exports live in ./index.ts.
export { getCurrentUser } from "./services/current-user"
export {
  mirrorRoleToClerk,
  suspendClerkUser,
  syncClerkUser,
  type UserRow,
} from "./services/user-sync"
export {
  AuthorizationError,
  requirePagePermission,
  requirePermission,
  type AuthorizationErrorCode,
} from "./services/authorization"

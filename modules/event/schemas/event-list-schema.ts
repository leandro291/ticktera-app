import { z } from "zod";
import { EVENT_LIST_SCOPES } from "../types/event-list";

// Strip por defecto: cualquier otro parámetro (p. ej. organizerId) se descarta.
export const eventListQuerySchema = z.object({ scope: z.enum(EVENT_LIST_SCOPES) });

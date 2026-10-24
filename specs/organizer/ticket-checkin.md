# Check-in de entradas en puerta

- Module: organizer
- Status: done
- Approved by: Leandro Rojas (2026-10-24) — Q1–Q8 resueltas con las recomendaciones
- Mode: SDD

Trello: #24 (https://trello.com/c/10Zk7zW2). Depende de #20 (entradas con `tickets.code` y QR, hecho). Convive con #23 (reembolso → `void`, pendiente): el check-in ya rechaza `void`.

## Goal
El ítem "Check-in" del panel del organizador (hoy "Pronto") abre `/organizer/check-in`, donde el personal de puerta escanea (si el navegador puede) o escribe el código de una entrada. El servidor valida que sea de un evento del organizador (admin/super_admin: de cualquiera) y esté `valid`, la marca `used` y rechaza el doble ingreso aunque dos puertas la presenten a la vez.

## Scope
- In:
  - Permiso nuevo `tickets:check-in` y su matriz (organizer, admin, super_admin).
  - Server Action `checkInTicketAction` con el patrón `run` (permiso → Zod → servicio), mensajes fijos por código de error.
  - Servicio `checkInTicket`: búsqueda por código exacto, reglas de dominio puras, `UPDATE` condicional atómico `valid → used`.
  - Límite de intentos fallidos por usuario en la propia app (contrato de system-design §3 "Contrato para #24"; aws-production §9 no tiene WAF).
  - Página `/organizer/check-in` con ingreso manual siempre disponible y escáner de cámara solo si el navegador trae `BarcodeDetector` (sin dependencias nuevas).
  - Ítem de nav habilitado en `panel-nav.ts`.
- Out:
  - Lista de asistentes, contador de ingresados, historial de check-ins (no hay `used_at` ni `checked_in_by`; ver Q3).
  - Deshacer un check-in (`used → valid`).
  - Rol "personal de puerta" sin cuenta de organizador.
  - Modo sin conexión / validación con firma (el QR es solo el código, system-design §3).
  - Restringir por fecha u horario del evento (Q2).
  - Reembolsos (#23): solo se respeta `void` y orden no `paid`.
  - Librería de escaneo (`jsqr`, `zxing`): no instaladas; si `BarcodeDetector` falta, queda el ingreso manual.

## Reuse
Reference: system-design §2 (autorización en dos capas, matriz), §3 "Entradas, QR y Mis entradas" (contrato para #24), mer.md `tickets`, `orders`, `events`.
- Reuse: `modules/auth/server.ts` `requirePermission` / `AuthorizationError` — capa 2 de autorización contra la BD.
- Reuse: patrón `run` de `modules/event/actions/event-actions.ts` — se replica el esqueleto (no se extrae: son 25 líneas con tipos de resultado distintos; DRY se aplica con 3+ usos).
- Reuse: `modules/auth` `can(role, "events:read-all")` — decide "cualquier evento" (admin/super_admin) sin permiso extra ni lista de roles hardcodeada.
- Reuse: `components/ui/{input,button,badge}`, `lucide-react` (`QrCodeIcon` ya mapeado en `panel-shell.tsx`) — UI.
- Reuse: `app/organizer/layout.tsx` + `PanelShell` + regla de prefijo `/organizer` de `route-access.ts` — el proxy y el layout ya protegen `/organizer/check-in`; no se toca nada de ruteo.
- Reuse: `db/schema` (`tickets`, `order_items`, `orders`, `ticket_types`, `events`) — sin migración.
- Extend: `modules/auth/lib/permissions.ts` (+ test) — permiso `tickets:check-in`.
- Extend: `components/shared/panel-nav.ts` (+ test) — `href`/`match`/`permission` del ítem `check-in`.
- Extend: `modules/organizer/index.ts` — exporta `CheckInPanel`.
- New: `modules/organizer/{actions,services,schemas,types,lib,hooks,components}/…check-in…` — el dominio es "puerta del organizador"; no cabe en `purchase` (emite) ni en `event` (CRUD). Un módulo no importa internos de otro (SETUP §1.6), por eso la normalización del código vive aquí aunque el generador esté en `purchase/lib/order-code.ts`.
- New: limitador de intentos en memoria — no existe ningún rate limit en el repo ni dependencia que lo cubra; Q1.
- New: `use-barcode-scanner.ts` — no hay escáner en el repo ni dependencia instalada; se usa la API nativa `BarcodeDetector` + `getUserMedia`. `lib.dom` de TS no trae el tipo: se declara un tipo mínimo local.
- Descartado: `modules/purchase/lib/order-code.ts` `CODE_ALPHABET` para validar el formato: importa `node:crypto` y rompería el bundle cliente; el schema valida `^[A-Z0-9]{12}$` y la búsqueda exacta hace el resto.

## Decisions (propuestas, el usuario valida)
| #  | Decisión |
| -- | -------- |
| D1 | Server Action, no route handler (patrón pedido y ya usado en `event` y `users`). system-design §3 dice "endpoint": se actualiza el doc al implementar. |
| D2 | Permiso nuevo `tickets:check-in`. "Cualquier evento" = `can(role, "events:read-all")`. Evento de otro organizador responde igual que código inexistente (`not-found`), sin filtrar existencia. |
| D3 | Sin transacción explícita: (1) `SELECT` del ticket con su evento y orden; (2) reglas puras; (3) `UPDATE tickets SET status='used' WHERE id=$1 AND status='valid' RETURNING id`. Si devuelve 0 filas, otro ganó la carrera → `already-used`. La unicidad la da la BD, no el `SELECT`. |
| D4 | Reglas en orden: formato → evento ajeno (`not-found`) → `used` (`already-used`) → `void` u orden no `paid` (`void`) → evento no `published` (`event-inactive`) → marcar. |
| D5 | Límite: solo cuentan los intentos **fallidos** (`not-found`, `already-used`, `void`, `event-inactive`, `invalid-code`); máx. 15 por minuto por `actor.id`. Superado → `rate-limited` sin tocar la BD. Los éxitos no cuentan (una puerta puede pasar cientos por hora). 15/min sobre 31^12 códigos (~59 bits) vuelve inviable adivinar. |
| D6 | El código nunca se loguea ni va en URL/query; el log de la action solo registra el código de error y `actor.id`. |
| D7 | Cámara: `BarcodeDetector({ formats: ["qr_code"] })` con `getUserMedia({ video: { facingMode: "environment" } })`, detección con `requestAnimationFrame`. Al detectar, se pausa hasta recibir la respuesta y se ignora el mismo código por 3 s (evita que el segundo escaneo del mismo QR muestre "ya usada" tras un ingreso correcto). |

## Acceptance criteria
- AC1: `normalizeTicketCode` pasa a mayúsculas y quita espacios y guiones (`" abc-def 234567 "` → `"ABCDEF234567"`). El schema Zod rechaza (`invalid-code`) lo que no quede en 12 caracteres `[A-Z0-9]`, sin consultar la BD.
- AC2: Sin sesión, usuario suspendido o `customer` reciben el mensaje de `AuthorizationError` y la BD no se toca. `organizer`, `admin` y `super_admin` pasan.
- AC3: Código `valid`, de un evento `published` propio, orden `paid` → la entrada queda `used` y la respuesta trae nombre del evento, tipo de entrada y titular, con `ok: true`.
- AC4: Organizador con el código de un evento ajeno recibe `not-found` (idéntico a un código inexistente) y la entrada sigue `valid`. `admin` y `super_admin` sí pueden marcarla.
- AC5: Entrada `used` → `already-used`, sin cambios en BD.
- AC6: Entrada `void`, o cuyo pedido no está `paid` → `void` ("anulada"), sin cambios.
- AC7: Entrada `valid` de un evento `cancelled` o `suspended` → `event-inactive`, sin cambios.
- AC8: Dos check-ins simultáneos del mismo código: exactamente uno responde `ok: true` y el otro `already-used`. Se garantiza por el `UPDATE … WHERE status='valid' RETURNING`; si devuelve 0 filas el servicio responde `already-used`.
- AC9: Tras 15 intentos fallidos en un minuto, el siguiente (aunque sea válido) responde `rate-limited` sin consultar la BD; un minuto después vuelve a funcionar. Los éxitos no consumen cupo; el cupo es por usuario.
- AC10: Todos los mensajes de error son fijos por código (sin detalles de BD ni el código ingresado); el código no aparece en logs ni URL.
- AC11: `panel-nav`: `check-in` queda habilitado con `href: "/organizer/check-in"` para organizer, admin y super_admin; en esa ruta el ítem activo es "Check-in" (no "Eventos"). Pagos sigue en "Pronto".
- AC12: En `/organizer/check-in` hay un campo de código (autofocus) y botón "Validar"; Enter envía. El resultado se muestra grande: éxito (verde, evento + tipo + titular) o error (rojo, mensaje por código). Tras un resultado el campo se limpia y recupera el foco. Mientras hay una solicitud en curso el botón está deshabilitado.
- AC13: Si `window.BarcodeDetector` y `navigator.mediaDevices.getUserMedia` existen, aparece "Escanear con cámara" que abre la cámara trasera, detecta un QR, valida y pausa hasta tener respuesta; el mismo código no se reenvía durante 3 s. Si no existen, el botón no se muestra y el ingreso manual sigue funcionando. Si el usuario niega la cámara, se muestra un mensaje y el ingreso manual sigue. La cámara se apaga al salir de la página o al cerrarla.
- AC14: Un `customer` o visitante que abre `/organizer/check-in` es redirigido (proxy + layout existentes; solo se verifica, no se cambia).

## Contracts

```ts
// modules/auth/lib/permissions.ts
// Permission += "tickets:check-in"  → organizer, admin, super_admin

// modules/organizer/types/check-in.ts
export type CheckInErrorCode =
  | "invalid-code"
  | "not-found"
  | "already-used"
  | "void"
  | "event-inactive"
  | "rate-limited";

export interface CheckedInTicket {
  eventTitle: string;
  tierName: string;
  holderName: string;
}

export type CheckInResult =
  | { ok: true; ticket: CheckedInTicket }
  | { ok: false; error: string; code?: CheckInErrorCode }; // code ausente = fallo de permiso/genérico

// modules/organizer/schemas/check-in-schema.ts
export const checkInSchema: z.ZodObject<{ code: z.ZodPipe<…> }>; // trim→normalize→/^[A-Z0-9]{12}$/
export type CheckInInput = z.output<typeof checkInSchema>;      // { code: string } normalizado

// modules/organizer/lib/ticket-code.ts
export function normalizeTicketCode(raw: string): string;

// modules/organizer/lib/check-in-rules.ts  (puro)
export interface CheckInCandidate {
  ticketStatus: "valid" | "used" | "void";
  orderStatus: "pending" | "paid" | "expired" | "refunded";
  eventStatus: "draft" | "published" | "cancelled" | "suspended";
  eventOrganizerId: string;
}
export function classifyTicket(
  c: CheckInCandidate,
  actor: { id: string; canCheckInAny: boolean },
): "ok" | Exclude<CheckInErrorCode, "invalid-code" | "rate-limited">;

// modules/organizer/lib/attempt-limiter.ts  (puro, reloj inyectable)
export function createAttemptLimiter(opts: { max: number; windowMs: number; now?: () => number }): {
  isBlocked(key: string): boolean;
  recordFailure(key: string): void;
};

// modules/organizer/services/check-in-service.ts  (server)
export class CheckInError extends Error { code: CheckInErrorCode }
export function checkInTicket(
  actor: { id: string; role: Role },
  input: CheckInInput,
): Promise<CheckedInTicket>; // lanza CheckInError

// modules/organizer/actions/check-in-actions.ts  ("use server")
export function checkInTicketAction(input: unknown): Promise<CheckInResult>;

// modules/organizer/hooks/use-barcode-scanner.ts  ("use client")
export function useBarcodeScanner(opts: {
  enabled: boolean;
  onDetect: (value: string) => void;
}): { supported: boolean; videoRef: RefObject<HTMLVideoElement | null>; error: string | null };

// modules/organizer/index.ts
export { CheckInPanel } from "./components/check-in-panel";

// app/organizer/check-in/page.tsx → <CheckInPanel />  (metadata: "Check-in")
```

Mensajes fijos (action): `invalid-code` "Código inválido: tiene 12 caracteres."; `not-found` "No encontramos esa entrada."; `already-used` "Esta entrada ya fue usada."; `void` "Esta entrada está anulada."; `event-inactive` "El evento está cancelado o suspendido."; `rate-limited` "Demasiados intentos fallidos. Espera un minuto."; permisos: los de `AUTH_MESSAGES`; genérico: "No se pudo validar. Reintenta."

## Edge cases
- Mayúsculas/minúsculas, espacios, guiones o saltos de línea pegados desde un lector USB (AC1).
- Código con letras fuera del alfabeto (`0`, `O`, `1`, `I`, `L`) pero de 12 caracteres: pasa el schema y devuelve `not-found` (búsqueda exacta; el alfabeto no se duplica).
- Doble toque en "Validar" o QR leído dos veces: el botón se deshabilita durante la solicitud; la cámara ignora el mismo código 3 s; el servidor igual lo cubre con `already-used`.
- Reinicio del proceso borra el contador del limitador (aceptado: instancia única, Q1).
- Evento suspendido/cancelado tras vender entradas: rechazo `event-inactive` y no se marca.
- Organizador suspendido: `requirePermission` lo corta (`suspended`).
- `BarcodeDetector` ausente (Safari iOS, Firefox) → solo ingreso manual; `getUserMedia` solo funciona en HTTPS/localhost.
- Cámara sin permiso o sin dispositivo → mensaje, sin romper la página.
- Error de BD en el servicio → mensaje genérico, `console.error` sin el código ingresado.

## Tests
- `modules/auth/lib/permissions.test.ts` — AC2: `tickets:check-in` en organizer/admin/super_admin y no en customer (actualiza `ALL` y `EXPECTED`).
- `components/shared/panel-nav.test.ts` — AC11: check-in habilitado para organizer/admin/super_admin; ruta activa; `organizerItems` pasa a incluir `check-in`, Pagos sigue "Pronto".
- `modules/organizer/lib/ticket-code.test.ts` — AC1: mayúsculas, espacios, guiones, saltos de línea.
- `modules/organizer/schemas/check-in-schema.test.ts` — AC1: acepta normalizado de 12; rechaza vacío, 11 y 13 caracteres, símbolos.
- `modules/organizer/lib/check-in-rules.test.ts` — AC3-AC7: tabla de combinaciones (propio/ajeno × canCheckInAny, valid/used/void, paid/refunded/pending, published/cancelled/suspended) y el orden de precedencia de D4.
- `modules/organizer/lib/attempt-limiter.test.ts` — AC9: bloquea en el intento 16, reabre tras la ventana (reloj inyectado), claves independientes.
- `modules/organizer/services/check-in-service.test.ts` — AC3, AC8, AC9: con `@/db` mockeado (`vi.mock`): éxito devuelve el ticket; `UPDATE … RETURNING` vacío → `already-used`; bloqueado por el limitador no llama a `db`; solo fallos incrementan el contador. La unicidad real a nivel BD se verifica manualmente (ver T4).
- Sin tests de `check-in-panel.tsx` ni del hook de cámara (markup/API del navegador; SETUP §3).

## Plan

### Phase 1 — Check-in server-side (permiso, reglas, servicio, action)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: permiso `tickets:check-in` en la matriz y su test | modules/auth/lib/permissions.ts, modules/auth/lib/permissions.test.ts | - | A | AC2 | todo |
| T2 | tipos, schema, normalización, reglas puras y limitador (todo con tests) | modules/organizer/types/check-in.ts, modules/organizer/schemas/check-in-schema.ts, modules/organizer/schemas/check-in-schema.test.ts, modules/organizer/lib/ticket-code.ts, modules/organizer/lib/ticket-code.test.ts, modules/organizer/lib/check-in-rules.ts, modules/organizer/lib/check-in-rules.test.ts, modules/organizer/lib/attempt-limiter.ts, modules/organizer/lib/attempt-limiter.test.ts | - | A | AC1, AC3-AC7, AC9 | todo |
| T3 | servicio `checkInTicket`: SELECT con joins, `classifyTicket`, UPDATE condicional `RETURNING`, limitador singleton por `actor.id` | modules/organizer/services/check-in-service.ts, modules/organizer/services/check-in-service.test.ts | T1, T2 | - | AC3-AC9 | todo |
| T4 | action `checkInTicketAction` con `run` (permiso `tickets:check-in` → Zod → servicio), mensajes fijos. Además de los tests: verificación manual de AC8 con dos llamadas concurrentes al mismo código contra una BD local (anotar resultado en la PR) | modules/organizer/actions/check-in-actions.ts | T3 | - | AC2, AC8, AC10 | todo |

Fase verificable: `lint + tsc + vitest` en verde; la app no cambia visualmente.

### Phase 2 — UI y nav
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T5 | hook `useBarcodeScanner` (detección de soporte, stream, loop, limpieza, ignorar repetido 3 s) | modules/organizer/hooks/use-barcode-scanner.ts | - | A | AC13 | todo |
| T6 | habilitar el ítem `check-in` en `panel-nav.ts` y su test | components/shared/panel-nav.ts, components/shared/panel-nav.test.ts | T1 | A | AC11 | todo |
| T7 | `CheckInPanel` (input, resultado verde/rojo, botón de cámara condicional, foco) + export en el index del módulo | modules/organizer/components/check-in-panel.tsx, modules/organizer/components/check-in-result.tsx, modules/organizer/index.ts | T4, T5 | - | AC12, AC13 | todo |
| T8 | página delgada `/organizer/check-in` + sync de docs (mer.md `tickets` ya no "no existe todavía"; system-design §3 "endpoint" → Server Action) | app/organizer/check-in/page.tsx, docs/architecture/mer.md, docs/architecture/system-design.md | T7 | - | AC14 | todo |

Fase verificable: `lint + tsc + vitest` en verde; el ítem Check-in navega a una página funcional.

## Open questions
- Q1: Limitador en memoria (D5) vs. tabla/Redis. Recomendación: **en memoria**. La demo corre en una instancia (aws-production), y 15 fallos/min sobre ~59 bits es suficiente; si hay varias instancias o un reinicio es riesgo, se pasa a BD. Techo documentado con un comentario `ponytail:` en el archivo.
- Q2: ¿Limitar el check-in a la fecha/hora del evento (p. ej. el día en hora de Lima)? Recomendación: **no limitar** ahora. No hay `ends_at`, y bloquear en puerta por reloj o zona horaria genera falsos rechazos peores que el riesgo.
- Q3: ¿Registrar `used_at` y `checked_in_by` (requiere migración y tocar `mer.md`)? Recomendación: **no en esta spec**; sin ellos "ya usada" no puede decir cuándo, pero el MVP queda sin migración. Es el primer paso natural si luego se quiere historial o contador de ingresados.
- Q4: ¿Rechazar entradas de eventos `cancelled`/`suspended`? Recomendación: **sí** (D4, AC7); un evento cancelado no debería dejar entrar a nadie.
- Q5: ¿Permiso nuevo `tickets:check-in` o reutilizar `organizer:panel`? Recomendación: **nuevo** (cuesta una línea y desacopla la acción del acceso al panel); "cualquier evento" sale de `events:read-all`.
- Q6: Cámara con `BarcodeDetector` nativo (Chrome/Edge/Android; no Safari iOS ni Firefox) sin dependencias. Recomendación: **aceptar** y dejar el ingreso manual como respaldo. Un polyfill/librería (`zxing-wasm`, `jsqr`) solo si el personal de puerta usa iPhone; sería otra spec.
- Q7: system-design §3 habla de "endpoint de check-in"; la card pide Server Action. Recomendación: **Server Action** (D1) y actualizar el doc en T8. No contradice el contrato (límite de intentos + búsqueda exacta).
- Q8: ¿Personal de puerta sin cuenta de organizador (rol `staff`)? Fuera de alcance; hoy el organizador comparte su sesión o entra con su cuenta.

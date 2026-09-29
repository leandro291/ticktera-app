# System design y MER de base de datos

- Module: platform
- Status: done
- Approved by: lenadro291 (2026-09-29)
- Mode: SDD

## Goal
Documentar la arquitectura de Ticktera (ambientes local y producción, autenticación y roles, pagos, flujos de compra) y definir el modelo de datos (MER) a partir de la UI del artifact de Claude Design, dejando el schema Drizzle listo para migrar. No se implementa ninguna integración ni UI.

## Scope
- In: `docs/architecture/system-design.md`, `docs/architecture/mer.md`, schema Drizzle en `db/schema/`, `drizzle.config.ts`, `lib/env.ts` (solo `DATABASE_URL`), migración SQL generada (no ejecutada).
- Out: código de Clerk, Stripe y Google Maps (webhooks, proxy, Server Actions), toda la UI, el design system visual (`docs/design-system.md` no se toca), CI/CD y Terraform (solo descritos), envío de emails, escaneo de entradas en puerta, test runner, ejecutar migraciones contra Neon o Cloud SQL.

## Reuse
- Reuse: `zod` (instalado) — validación de env en `lib/env.ts`.
- Reuse: `docs/SETUP.md` — naming en inglés, kebab-case, plantilla de spec.
- Extend: `docs/SETUP.md` — agregar `db/` a la estructura base (excepción justificada: la BD es transversal y las FK cruzan dominios; rompería la regla 6 ponerla dentro de cada módulo).
- Extend: `package.json` — `drizzle-orm`, `pg`, `@types/pg`, `drizzle-kit` (dev).
- New: `db/`, `docs/architecture/` — no existe nada equivalente en el repo (verificado con Glob: sin código de BD ni docs de arquitectura).

## Decisiones tomadas con el usuario
| # | Decisión |
| - | -------- |
| D1 | Local: Neon + `localhost`. Producción: GCP, Cloud Run + Cloud SQL Postgres. |
| D2 | Auth con Clerk (email/password y Google). Pagos con Stripe. Google Maps solo en producción. |
| D3 | Roles: `super_admin`, `admin`, `organizer`, `customer`. Usuario = organizador (sin organizaciones ni equipos). |
| D4 | Solo Stripe con tarjeta (`PEN`). Yape y PagoEfectivo del artifact quedan fuera. |
| D5 | Solo cobra la plataforma: sin Stripe Connect, comisiones ni payouts en el modelo. |
| D6 | Venue como campos del evento. Zona = tipo de entrada (`ticket_types`), sin mapa dibujado por venue. |
| D7 | Reserva temporal = orden `pending` con `expires_at`, sin tabla de holds. |
| D8 | Cuenta obligatoria para comprar (`orders.user_id` NOT NULL). |
| D9 | Fuente de verdad del rol: `users.role` en la BD, con espejo en Clerk `publicMetadata.role`. |
| D10 | MER en Mermaid más schema Drizzle. Un solo driver `pg` para Neon y Cloud SQL. |

## Supuestos (aprobados en la sesión, corregibles en la revisión)
- A1 cliente → organizador por autoservicio ("Vender entradas"). A2 primer `super_admin` por seed con `SUPER_ADMIN_EMAIL`. A3 `admin` suspende eventos y usuarios pero no cambia roles.
- A4 reserva de 15 minutos. A5 pago tardío: se honra si hay cupo, si no se reembolsa. A6 emails fuera de alcance.
- A7 `categories` es tabla. A8 `holder_name` por defecto = comprador. A9 sin `audit_logs`, escaneo ni tabla de emails.

## Acceptance criteria
- AC1: `docs/architecture/system-design.md` incluye el diagrama de componentes, la tabla local vs producción, el listado de variables de entorno por ambiente y la política de migraciones (pipeline en prod, nunca desde la app).
- AC2: El mismo documento describe la autenticación y los roles: flujo Clerk → webhook → `users`, rol con espejo en Clerk, autorización en dos capas (proxy + revalidación en cada acción) y la matriz de rutas por rol.
- AC3: El mismo documento describe pagos: PaymentIntent con Payment Element solo `card` en `PEN`, creación de orden con `SELECT … FOR UPDATE`, webhooks idempotentes vía `stripe_events`, job de vencimiento con Cloud Scheduler, reembolsos y el riesgo abierto de Stripe/PEN desde Perú.
- AC4: `docs/architecture/mer.md` contiene un `erDiagram` de Mermaid con las 9 tablas y sus relaciones, el diccionario de columnas (tipo, nulabilidad, constraints, índices) y los supuestos A7–A9.
- AC5: `db/schema/` define las 9 tablas (`users`, `categories`, `events`, `ticket_types`, `orders`, `order_items`, `tickets`, `payments`, `stripe_events`) con enums, únicos, `CHECK` e índices idénticos al diccionario del MER.
- AC6: `npx drizzle-kit generate` produce la migración SQL sin errores y sin conectarse a ninguna BD. No se ejecuta ninguna migración.
- AC7: `lib/env.ts` valida `DATABASE_URL` con Zod y, si falta o es inválida, lanza un error con el nombre de la variable.
- AC8: `npm run lint` y `npx tsc --noEmit` pasan. `docs/design-system.md` y `app/` quedan sin cambios.

## Contracts

Convenciones: PK `uuid` (`defaultRandom()`), tiempos `timestamptz`, montos en céntimos (`integer`), `PEN` implícito (sin columna de moneda). Las cantidades vendidas no se almacenan: se derivan de `order_items` de órdenes `paid` o `pending` vigentes.

```
users 1─N events 1─N ticket_types 1─N order_items N─1 orders N─1 users
                                       order_items 1─N tickets
categories 1─N events          orders 1─N payments      stripe_events (aislada)
```

Enums (`db/schema/enums.ts`): `user_role` (super_admin, admin, organizer, customer), `user_status` (active, suspended), `document_type` (dni, ce, passport), `event_status` (draft, published, cancelled, suspended), `order_status` (pending, paid, expired, refunded), `ticket_status` (valid, used, void), `payment_status` (pending, succeeded, failed, refunded).

| Tabla | Columnas | Restricciones e índices |
| ----- | -------- | ----------------------- |
| `users` | `clerk_user_id` text, `email` text, `full_name` text, `phone` text?, `document_type`?, `document_number` text?, `role` (default customer), `status` (default active), `created_at`, `updated_at` | únicos `clerk_user_id`, `email` |
| `categories` | `slug`, `name`, `image_url`?, `sort_order` int | único `slug` |
| `events` | `organizer_id`→users, `category_id`→categories, `slug`, `title`, `description`?, `cover_image_url`?, `starts_at`, `venue_name`, `address`?, `city`, `lat` numeric?, `lng` numeric?, `status` (default draft), `published_at`?, `created_at`, `updated_at` | único `slug`. Índices `(status, starts_at)`, `city`, `category_id`, `organizer_id` |
| `ticket_types` | `event_id`→events (cascade), `name`, `price_cents`, `capacity`, `max_per_order`, `sort_order` | único `(event_id, name)`. `CHECK capacity >= 0`, `price_cents >= 0`, `max_per_order > 0` |
| `orders` | `code` text, `user_id`→users, `status` (default pending), `total_cents`, `expires_at`, `paid_at`?, `created_at` | único `code`. Índices `(status, expires_at)`, `user_id`. `CHECK total_cents >= 0` |
| `order_items` | `order_id`→orders (cascade), `ticket_type_id`→ticket_types, `quantity`, `unit_price_cents` | `CHECK quantity > 0`. Índices `order_id`, `ticket_type_id` |
| `tickets` | `order_item_id`→order_items (cascade), `code` text, `holder_name`, `status` (default valid) | único `code`. Índice `order_item_id` |
| `payments` | `order_id`→orders, `stripe_payment_intent_id`, `stripe_charge_id`?, `status` (default pending), `amount_cents`, `card_brand`?, `card_last4`?, `created_at` | único `stripe_payment_intent_id`. Índice `order_id` |
| `stripe_events` | `id` text PK (el `event.id` de Stripe), `type`, `processed_at` | PK = id (idempotencia) |

Endpoints internos (documentados, no implementados): `POST /api/webhooks/clerk`, `POST /api/webhooks/stripe`, `POST /api/internal/expire-orders` (token OIDC de Cloud Scheduler).

Variables de entorno documentadas: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (opcional), `SUPER_ADMIN_EMAIL`. En este alcance `lib/env.ts` valida solo `DATABASE_URL`; cada spec de integración agrega las suyas (YAGNI).

## Edge cases
- Dos compradores pelean el último cupo: la transacción bloquea con `FOR UPDATE` las filas de `ticket_types`; el segundo recibe "sin disponibilidad".
- Webhook de Stripe duplicado o reordenado: el `event.id` ya está en `stripe_events`, se ignora.
- Pago tardío sobre orden `expired`: se honra si hay cupo, si no se reembolsa automáticamente (A5).
- Usuario borrado en Clerk: la fila queda `suspended`, sus órdenes se conservan.
- Falla el espejo del rol en Clerk: la acción falla y se reintenta; la BD no queda adelantada sin aviso.
- Cambiar el precio de un tipo de entrada no altera órdenes previas (`unit_price_cents` congelado).
- Bajar `capacity` por debajo de lo vendido: se valida en la aplicación, no en la BD (lo documenta `system-design.md`).
- Local sin Google Maps: `lat`/`lng` quedan nulos y la dirección se guarda como texto.

## Tests
- Sin tests unitarios en esta spec: el schema es declarativo y `lib/env.ts` es un solo parseo Zod. No hay test runner y agregarlo no aporta valor todavía. La verificación es `lint`, `tsc` y `drizzle-kit generate` (AC6–AC8).

## Plan

### Phase 1 — Documentos de arquitectura (sin dependencias nuevas)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Escribir system design (componentes, ambientes, auth y roles, pagos, env vars, riesgos) | docs/architecture/system-design.md | - | A | AC1, AC2, AC3 | done |
| T2 | Escribir MER (erDiagram Mermaid, diccionario, supuestos A7–A9) | docs/architecture/mer.md | - | A | AC4 | done |

### Phase 2 — Schema Drizzle
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T3 | setup: instalar `drizzle-orm`, `pg`, `@types/pg`, `drizzle-kit`; enums; `drizzle.config.ts`; `lib/env.ts`; agregar `db/` a SETUP | package.json, package-lock.json, db/schema/enums.ts, drizzle.config.ts, lib/env.ts, docs/SETUP.md | T2 | - | AC7 | done |
| T4 | Schema de users, categories, events, ticket_types | db/schema/users.ts, db/schema/events.ts | T3 | - | AC5 | done |
| T5 | Schema de orders, order_items, tickets, payments, stripe_events | db/schema/orders.ts | T4 | - | AC5 | done |
| T6 | Índice del schema, generar migración y verificar | db/schema/index.ts, drizzle/ | T5 | - | AC5, AC6, AC8 | done |

Nota: en la Fase 2 las tareas son secuenciales porque las FK de `orders.ts` importan tablas de `events.ts` y `users.ts`. La Fase 1 tiene un solo grupo paralelo (T1 y T2).

## Open questions
- Verificar antes de producción si Stripe permite abrir la cuenta de la plataforma y cobrar en `PEN` desde Perú (no confirmado). Puede obligar a otra jurisdicción para la cuenta.
- Proveedor de emails (A6) para la spec de confirmaciones.
- Marca: el artifact dice "Ticketera" y el repo "Ticktera". Definir el nombre oficial antes de publicar copy.
- Audiencia y configuración del token OIDC de Cloud Scheduler: se decide en la spec de despliegue.

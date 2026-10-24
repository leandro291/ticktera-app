# Ticktera

Plataforma de venta de entradas para eventos (Perú, soles). Catálogo público, compra con tarjeta (Stripe), entradas con QR y PDF en "Mis entradas", y paneles de organizador y administración.

**Demo en vivo (sandbox):** https://d2tr2lcud9jcsr.cloudfront.net — Clerk y Stripe en modo test; tarjeta de prueba `4242 4242 4242 4242`.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** strict
- **Tailwind CSS 4** + **shadcn/ui** (`base-nova`, sobre `@base-ui/react`) + `lucide-react`
- **PostgreSQL** + **Drizzle ORM** (migraciones con `drizzle-kit`)
- **Clerk** (auth y roles, con webhook de sincronización) y **Stripe** (PaymentIntent + Payment Element, webhook firmado)
- **Vitest** para tests; datos y estado con `@tanstack/react-query`, `zustand` y `zod`

## Empezar

```bash
npm install
cp .env.example .env     # completar Clerk, Stripe y DATABASE_URL
npx drizzle-kit migrate
npm run db:seed -- --organizer <email>   # categorías y eventos de ejemplo
npm run dev              # http://localhost:3000
```

| Comando | Qué hace |
| ------- | -------- |
| `npm run dev` / `build` / `start` | Desarrollo, build y producción |
| `npm run lint` | ESLint 9 (`core-web-vitals` + `typescript`) |
| `npm test` | Tests (Vitest) |
| `npx tsc --noEmit` | Typecheck (antes `npx next typegen`) |
| `npm run db:seed -- --organizer <email>` | Siembra categorías, eventos y tipos de entrada |

## Estructura

```
app/          # solo routing (páginas delgadas que componen desde modules/)
modules/      # un módulo por dominio: components, hooks, services, schemas, store, types
components/
  ui/         # shadcn/ui
  shared/     # reutilizables entre módulos
db/           # esquema Drizzle y seed
infra/aws/    # bootstrap de la EC2 y script de deploy
specs/        # specs SDD por módulo
docs/         # SETUP.md, design-system.md y architecture/
```

Las reglas del proyecto (naming, estructura, SOLID/DRY/KISS/YAGNI, shadcn primero) están en **[`docs/SETUP.md`](docs/SETUP.md)**, la fuente de verdad. La arquitectura está en [`docs/architecture/`](docs/architecture/).

## Deploy

Demo en AWS (us-east-2, ≈ USD 27/mes): CloudFront → EC2 (Docker) → RDS PostgreSQL. Cada push a `main` corre lint, typecheck y tests, y despliega con GitHub Actions (`.github/workflows/ci-cd.yml`). Detalle, recursos y costos en [`docs/architecture/aws-production.md`](docs/architecture/aws-production.md).

# next-js-template

Template base para proyectos Next.js con estructura por módulos de dominio y shadcn/ui.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** strict
- **Tailwind CSS 4** (configurado en `app/globals.css`, sin `tailwind.config`)
- **shadcn/ui** preset `base-nova` (basado en `@base-ui/react`, no Radix) + `lucide-react`
- Instalados, listos para usar: `@tanstack/react-query`, `@tanstack/react-table`, `zustand`, `axios`, `zod`

## Empezar

```bash
npm install
npm run dev        # http://localhost:3000
```

| Comando | Qué hace |
| ------- | -------- |
| `npm run dev` / `build` / `start` | Desarrollo, build y producción |
| `npm run lint` | ESLint 9 (`core-web-vitals` + `typescript`) |
| `npx tsc --noEmit` | Typecheck |
| `npx shadcn@latest add <component>` | Agregar componentes de UI |

## Estructura

```
app/          # solo routing (páginas delgadas que componen desde modules/)
modules/      # un módulo por dominio: components, hooks, services, schemas, store, types
components/
  ui/         # shadcn/ui
  shared/     # reutilizables entre módulos
hooks/        # hooks compartidos
lib/          # utilidades transversales (cn, instancia de axios)
docs/         # SETUP.md y design-system.md
```

Las reglas completas (naming, estructura, SOLID/DRY/KISS/YAGNI, shadcn primero) están en **[`docs/SETUP.md`](docs/SETUP.md)**, que es la fuente de verdad del proyecto.

## Deploy

Pensado para [Vercel](https://vercel.com/new): importá el repo y listo.

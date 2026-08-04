# Inventory Cloud

Sistema de gestión de inventarios — control de bienes muebles, bienes inmuebles, enseres y resguardos, con bitácora de auditoría, permisos por módulo y generación de etiquetas/reportes.

Desarrollado por [Trinium](https://github.com/TriniumMX).

## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) — Postgres, Auth (vía Edge Functions), Storage
- [pnpm](https://pnpm.io/) como gestor de paquetes

## Requisitos

- Node.js
- [pnpm](https://pnpm.io/installation)

## Desarrollo local

```sh
# Clonar el repositorio
git clone https://github.com/TriniumMX/Inventory_Cloud.git
cd Inventory_Cloud

# Instalar dependencias
pnpm i

# Copiar y completar las variables de entorno
cp .env.example .env   # si no existe .env.example, ver la sección de abajo

# Levantar el servidor de desarrollo
pnpm dev
```

### Variables de entorno

El frontend se conecta directamente a Supabase (auth, base de datos y storage). Variables requeridas en `.env`:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=

VITE_ORG_NAME=
VITE_LABEL_LOGO_URL=/logo.png
VITE_LABEL_URL_BASE=
```

## Scripts

```sh
pnpm dev        # servidor de desarrollo
pnpm build      # build de producción (dist/)
pnpm lint       # eslint
pnpm preview    # preview del build de producción
```

## Estructura del proyecto

- `src/` — aplicación React (páginas, componentes, lógica de acceso a datos en `src/lib/`)
- `supabase/migrations/` — migraciones SQL del esquema de base de datos
- `supabase/functions/` — Edge Functions (auth, consulta de empleados)
- `server/` — backend Express legado (ya no se usa en producción; el frontend habla directo con Supabase)

## Despliegue

El proyecto está conectado a [Vercel](https://vercel.com/) mediante el repositorio de GitHub — cada push a `main` dispara un deploy automático.

Ver [`DEPLOY.md`](./DEPLOY.md) para la convención de commits del equipo y notas de despliegue adicionales.

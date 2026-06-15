# Aluna web — imagen de producción (Next.js 15, App Router) para el monorepo pnpm + Turborepo.
#
# POR QUÉ UN SERVIDOR NODE DE LARGA VIDA (no serverless):
#   Las rutas API (runtime "nodejs") usan @aluna/ephemeris → el addon NATIVO `sweph`
#   (un .node cargado con node-gyp-build(__dirname)) MÁS los archivos de datos Swiss
#   Ephemeris (packages/ephemeris/ephe/*.se1, ~1.9 MB). `sweph` está marcado
#   `serverExternalPackages` en next.config.ts, así que Next NO lo empaqueta ni lo
#   traza: en un target serverless el .node se quedaría fuera del bundle y la ruta
#   fallaría en runtime. Un contenedor que lleva node_modules COMPLETO (con el
#   prebuild linux de sweph) + el árbol del monorepo resuelve ambas cosas de forma
#   natural y robusta.
#
# RESOLUCIÓN DE LOS .se1 EN RUNTIME:
#   Las rutas hacen setEphePath(process.cwd()/../../packages/ephemeris/ephe). Por eso
#   el contenedor arranca con WORKDIR=/app/apps/web (→ cwd) y conserva el layout del
#   monorepo: /app/packages/ephemeris/ephe queda exactamente dos niveles arriba.
#
# `sweph` publica prebuilds N-API para linux-x64 y linux-arm64, así que NO hace falta
# toolchain de C/C++ en la imagen: node-gyp-build carga el .node prebuilt. (Si algún
# día se usa una base/arch sin prebuild, añade build-essential + python3 a la etapa
# builder para que node-gyp compile desde fuente.)

# ---------- Etapa base ----------
# Node 20 LTS sobre Debian slim (glibc) — compatible con los prebuilds de sweph.
# (No usar Alpine/musl: los prebuilds de sweph son glibc.)
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# pnpm fijado al packageManager del repo.
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
WORKDIR /app

# ---------- Etapa builder ----------
# Instala TODAS las dependencias (incl. dev) y construye el monorepo.
FROM base AS builder

# 1) Copiamos solo los manifiestos primero, para cachear la capa de instalación.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/compute/package.json packages/compute/package.json
COPY packages/ephemeris/package.json packages/ephemeris/package.json
COPY packages/supabase/package.json packages/supabase/package.json

# Instalación reproducible desde el lockfile (incluye prebuilds nativos de sweph).
RUN pnpm install --frozen-lockfile

# 2) Copiamos el resto del árbol y construimos.
COPY . .

# next build NO necesita las llaves (todo está "cableado pero latente"); las llaves
# se inyectan en runtime como variables de entorno. Telemetría de Next desactivada.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @aluna/web build

# ---------- Etapa runner ----------
# Imagen final: conserva el árbol del monorepo COMPLETO (node_modules con el prebuild
# de sweph, los .se1, y el .next ya construido). Priorizamos correctitud sobre tamaño:
# los paquetes @aluna/* se consumen como FUENTE TypeScript (transpilePackages), no como
# dist, así que NO podamos node_modules para no romper la cadena de transpile ni la
# ruta relativa ../../packages/ephemeris/ephe.
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# El puerto lo fija la plataforma (Render/Railway/Fly) vía $PORT; default 3000.
ENV PORT=3000

# Usuario sin privilegios.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Copiamos el árbol ya construido desde el builder (incluye node_modules + .next + ephe).
COPY --from=builder --chown=nextjs:nodejs /app /app

USER nextjs

# cwd = apps/web para que process.cwd()/../../packages/ephemeris/ephe resuelva.
WORKDIR /app/apps/web

EXPOSE 3000

# `next start` sirve el build de producción (server de Node de larga vida).
CMD ["pnpm", "start"]

# Aluna · Backend Supabase (Plan 3)

Proyecto Supabase **`aluna`** (org "Gio Free").

- **Ref:** `xcilrdpcanielalpfvld`
- **URL:** `https://xcilrdpcanielalpfvld.supabase.co`
- **Región:** us-east-1 · Postgres 17

Las llaves van en `.env.local` (gitignored); ver `.env.example`. La URL y la llave anon/publishable
son públicas (seguras para cliente); el `service_role` es secreto y solo para backend.

## Esquema (tablas)

| Tabla | Qué guarda |
|---|---|
| `profiles_user` | cuenta (1:1 con `auth.users`); locale |
| `settings` | ajustes por cuenta (tema, modo de luz, sistema de casas, zodiaco, estilo de lectura, nivel de detalle) |
| `birth_profiles` | perfiles de nacimiento (N por cuenta): nombre, fecha/hora, lugar, lat/long, zona horaria, género |
| `charts` | cartas calculadas en caché (`cache_key` determinista + `result` jsonb) |

Al registrarse un usuario en `auth.users`, el trigger `handle_new_user` crea su `profiles_user` y
`settings` por defecto.

## Seguridad (RLS) — verificada en vivo

RLS activada en las 4 tablas; cada usuario solo accede a sus propias filas (`user_id = auth.uid()`).
Probado con 2 usuarios: el usuario 1 NO puede ver datos del usuario 2. El advisor de seguridad de
Supabase queda **sin hallazgos** (la función del trigger no es invocable como RPC).

## Migraciones

Aplicadas en orden a la BD en vivo (vía integración MCP). Reproducibles desde `migrations/`:

1. `0001_core_schema.sql` — tablas + trigger de alta
2. `0002_rls_policies.sql` — RLS + políticas
3. `0003_secure_trigger_function.sql` — revoca EXECUTE público de la función del trigger

Para aplicarlas a otro entorno: Supabase CLI (`supabase db push`) o el panel SQL.

## Tipos

`database.types.ts` (generado del esquema). Regenerar tras cambios de esquema.

## Arquitectura de cómputo (decisión)

Supabase = **datos + auth + RLS**. El **cálculo de cartas NO corre en Edge Functions** (Deno no
ejecuta el addon nativo `sweph`): vive en Node (`@aluna/ephemeris`), expuesto por un servicio/ruta
API de Node que cachea el resultado en `charts`. Pendiente: servicio de cómputo + cache-key + SDK
de cliente Supabase (siguiente tramo del Plan 3 / Plan 4 web).

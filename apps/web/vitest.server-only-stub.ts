// apps/web/vitest.server-only-stub.ts
// Alias de "server-only" para vitest (ver resolve.alias en vitest.config.ts).
// El paquete real hace `throw new Error(...)` en su export "default" (la
// condición que resuelven Node/Vite/vitest); Next.js sí lo alía a su propio
// `empty.js` vía webpack cuando bunlea Server Components, pero fuera de ese
// build (tests) esa condición "react-server" no aplica. Sin este stub,
// cualquier módulo que haga `import "server-only";` (frontera server-only
// explícita, ej. lib/chat-context.ts) crashearía en vitest con el throw de
// arriba. No-op: nada que exportar, es un import de solo efecto.
export {};

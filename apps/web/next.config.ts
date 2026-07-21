import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@aluna/core", "@aluna/supabase", "@aluna/ephemeris", "@aluna/compute"],
  serverExternalPackages: ["sweph"],
  // Despliegue por Docker / servidor Node de larga vida (recomendado): node_modules
  // completo + el árbol del monorepo están presentes, así que sweph y los .se1
  // resuelven solos y lo de abajo es inocuo (no afecta a `next start`).
  //
  // Despliegue serverless (p.ej. Vercel — alternativa, ver docs/deploy.md): Next
  // traza los .se1 de las rutas, pero como `sweph` es serverExternalPackages NO se
  // traza su addon nativo (.node), que quedaría fuera de la función. Forzamos su
  // inclusión en el trace de cada ruta que toca el motor. CAVEAT: hay que VERIFICAR
  // en el primer deploy que el .node carga (node-gyp-build(__dirname) necesita un
  // __dirname real); si falla, el target serverless no es viable y hay que usar el
  // contenedor/servidor Node.
  outputFileTracingIncludes: {
    "/api/chart": ["../../node_modules/.pnpm/**/sweph/prebuilds/**", "../../node_modules/.pnpm/**/sweph/*.js"],
    "/api/bazi": ["../../node_modules/.pnpm/**/sweph/prebuilds/**", "../../node_modules/.pnpm/**/sweph/*.js"],
    "/api/synastry": ["../../node_modules/.pnpm/**/sweph/prebuilds/**", "../../node_modules/.pnpm/**/sweph/*.js"],
    "/api/scores": ["../../node_modules/.pnpm/**/sweph/prebuilds/**", "../../node_modules/.pnpm/**/sweph/*.js"],
    "/api/chat": ["../../node_modules/.pnpm/**/sweph/prebuilds/**", "../../node_modules/.pnpm/**/sweph/*.js"],
    // share-card lee .ttf vendorizados y el arte RWS con fs vía process.cwd();
    // el trace no ve esas rutas dinámicas, así que las incluimos explícitamente.
    "/api/share-card": ["./lib/share/fonts/**", "./public/tarot/rws/**"],
  },
  // sweph se importa a través de @aluna/ephemeris (transpilado), así que
  // serverExternalPackages no basta para mantenerlo fuera del bundle. Lo
  // forzamos externo: su cargador nativo (node-gyp-build(__dirname)) necesita
  // un __dirname real, que webpack rompe al empaquetar.
  webpack: (config, { isServer }) => {
    if (isServer && Array.isArray(config.externals)) {
      config.externals.push({ sweph: "commonjs sweph" });
    }
    return config;
  },
};

export default withNextIntl(nextConfig);

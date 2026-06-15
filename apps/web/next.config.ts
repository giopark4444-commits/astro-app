import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@aluna/core", "@aluna/supabase", "@aluna/ephemeris", "@aluna/compute"],
  serverExternalPackages: ["sweph"],
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

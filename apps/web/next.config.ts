import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@aluna/core", "@aluna/supabase"],
};

export default withNextIntl(nextConfig);

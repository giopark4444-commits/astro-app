import type { MetadataRoute } from "next";

// Allow-all: las rutas de app tras auth no son indexables de todos modos.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" } };
}

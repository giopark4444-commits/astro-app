// apps/web/lib/share/dev-render-samples.mjs
// Script dev (no forma parte del build/deploy): genera un lote fijo de muestras
// representativas de las tarjetas compartibles y las escribe en disco para
// inspección visual manual. Cubre las 5 lentes, los 3 formatos, los 6 temas y
// los casos de estrés (esencia larga, número maestro, invertida, hanzi, layout
// horizontal de tarot en cuadrado, eyebrow con fecha).
//
// Ejecutar (necesita el tsconfig.json de este mismo directorio — ver su
// comentario — para que esbuild/tsx transforme JSX; por eso el `cd`):
//   cd apps/web/lib/share && npx tsx dev-render-samples.mjs [dir-salida]
//
// `dir-salida` es opcional (default: OUT_DIR de abajo, el scratchpad de la
// sesión que generó este archivo). Puede sobreescribirse por argv para correr
// el script en cualquier otra sesión/máquina.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// fonts.ts/tarot-art.ts resuelven sus rutas vía una constante de módulo
// `join(process.cwd(), ...)` asumiendo cwd=apps/web (así corren bajo `next
// dev`/`next start` — ver el comentario de fonts.ts, commit "cargar fuentes y
// arte con process.cwd()"), pero ESTE script necesita cwd=apps/web/lib/share
// para que tsx encuentre el tsconfig.json local (ver comentario de arriba) —
// dos asunciones de cwd incompatibles. Se corrige el cwd en runtime ANTES de
// importar render.ts: como esa constante se calcula en el top-level del
// módulo (se evalúa en cuanto se importa, no perezosamente), un `import`
// estático de render.ts al principio del archivo se resolvería ANTES de que
// corriera este chdir (los módulos importados se evalúan antes que el cuerpo
// del que importa) — por eso el import es dinámico, para que se difiera hasta
// después del chdir.
process.chdir(fileURLToPath(new URL("../..", import.meta.url)));
const { renderShareCardImage } = await import("./render.ts");

const OUT_DIR =
  process.argv[2] ??
  "/private/tmp/claude-501/-Users-gio/e2bcdddb-4cc7-4da5-9ff1-0fafd21799ee/scratchpad/fase2-samples";

const MIN_BYTES = 30_000;

/** @type {Array<{ name: string; params: import("./types").ShareCardParams; eyebrowDate?: string }>} */
const SAMPLES = [
  {
    name: "numeros-7-observatory-story",
    params: { lens: "numeros", number: 7, labelKey: "lifePath", format: "story", theme: "observatory", detail: true, locale: "es" },
  },
  {
    name: "numeros-1-aurora-story", // esencia larga (201 car.)
    params: { lens: "numeros", number: 1, labelKey: "lifePath", format: "story", theme: "aurora", detail: true, locale: "es" },
  },
  {
    name: "numeros-11-cosmic-story", // número maestro, con chip
    params: { lens: "numeros", number: 11, labelKey: "expression", format: "story", theme: "cosmic", detail: true, locale: "es" },
  },
  {
    name: "carta-sun-leo-alba-feed",
    params: { lens: "carta", body: "sun", sign: "leo", format: "feed", theme: "alba", detail: true, locale: "es" },
  },
  {
    name: "carta-sun-leo-observatory-story", // rueda natal HERO — glowzone
    params: { lens: "carta", body: "sun", sign: "leo", format: "story", theme: "observatory", detail: true, locale: "es" },
  },
  {
    name: "carta-sun-leo-alba-story", // rueda natal HERO, tema claro
    params: { lens: "carta", body: "sun", sign: "leo", format: "story", theme: "alba", detail: true, locale: "es" },
  },
  {
    name: "carta-moon-cancer-cosmic-square", // rueda natal FONDO full-bleed
    params: { lens: "carta", body: "moon", sign: "cancer", format: "square", theme: "cosmic", detail: true, locale: "es" },
  },
  {
    name: "carta-sun-leo-observatory-feed", // rueda natal FONDO, feed 3:4
    params: { lens: "carta", body: "sun", sign: "leo", format: "feed", theme: "observatory", detail: true, locale: "es" },
  },
  {
    name: "carta-asc-scorpio-observatory-story", // rueda natal HERO, foco ASC (glifo de texto)
    params: { lens: "carta", body: "asc", sign: "scorpio", format: "story", theme: "observatory", detail: true, locale: "es" },
  },
  {
    name: "pilares-jia-observatory-story",
    params: { lens: "pilares", dayStem: "jia", format: "story", theme: "observatory", detail: true, locale: "es" },
  },
  {
    name: "pilares-yi-selva-feed",
    params: { lens: "pilares", dayStem: "yi", format: "feed", theme: "selva", detail: true, locale: "es" },
  },
  {
    name: "tarot-fool-selva-feed",
    params: { lens: "tarot", cardId: "fool", reversed: false, format: "feed", theme: "selva", detail: true, locale: "es" },
  },
  {
    name: "tarot-moon-reversed-cosmic-story",
    params: { lens: "tarot", cardId: "moon", reversed: true, format: "story", theme: "cosmic", detail: true, locale: "es" },
  },
  {
    name: "horoscopo-aries-eclipse-story",
    params: { lens: "horoscopo", sign: "aries", format: "story", theme: "eclipse", detail: true, locale: "es" },
    eyebrowDate: "21 DE JULIO",
  },
  {
    name: "tarot-fool-cosmic-square", // layout horizontal (tarot + square)
    params: { lens: "tarot", cardId: "fool", reversed: false, format: "square", theme: "cosmic", detail: true, locale: "es" },
  },
  {
    name: "numeros-7-observatory-square",
    params: { lens: "numeros", number: 7, labelKey: "lifePath", format: "square", theme: "observatory", detail: true, locale: "es" },
  },
  {
    name: "carta-moon-cancer-aurora-story",
    params: { lens: "carta", body: "moon", sign: "cancer", format: "story", theme: "aurora", detail: true, locale: "es" },
  },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Generando ${SAMPLES.length} muestras en ${OUT_DIR}\n`);

  const results = [];
  for (const sample of SAMPLES) {
    const buf = await renderShareCardImage(sample.params, sample.eyebrowDate);
    const filePath = `${OUT_DIR}/${sample.name}.jpg`;
    writeFileSync(filePath, buf);
    const kb = (buf.length / 1024).toFixed(1);
    const flag = buf.length < MIN_BYTES ? "  ⚠ menor a 30KB" : "";
    console.log(`  ${sample.name}.jpg — ${kb}KB${flag}`);
    results.push({ name: sample.name, bytes: buf.length, path: filePath });
  }

  const under = results.filter((r) => r.bytes < MIN_BYTES);
  console.log(`\n${results.length}/${SAMPLES.length} archivos escritos.`);
  if (under.length > 0) {
    console.error(`FALLO: ${under.length} archivo(s) por debajo de ${MIN_BYTES} bytes: ${under.map((r) => r.name).join(", ")}`);
    process.exit(1);
  }
  console.log("OK: todos los archivos superan 30KB.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

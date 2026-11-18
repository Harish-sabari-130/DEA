import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const esbuildPath = path.resolve(__dirname, "../artifacts/api-server/node_modules/esbuild/lib/main.js");
const { build } = await import(`file://${esbuildPath.replace(/\\/g, "/")}`);

const testTsPath = path.resolve(__dirname, "test_new_clinical_api.ts");
const outPath = path.resolve(__dirname, "../artifacts/api-server/test_run.mjs");

await build({
  entryPoints: [testTsPath],
  bundle: true,
  format: "esm",
  platform: "node",
  alias: {
    "@workspace/api-zod": path.resolve(__dirname, "../lib/api-zod/src/index.ts"),
    "@workspace/db": path.resolve(__dirname, "../lib/db/src/index.ts"),
  },
  external: ["node:*", "pino", "pino-http", "express", "cookie-parser", "cors", "pg-native"],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outfile: outPath,
});

try {
  await import(`file://${outPath.replace(/\\/g, "/")}`);
} catch (err) {
  console.error("Caught error:", err);
  process.exit(1);
}

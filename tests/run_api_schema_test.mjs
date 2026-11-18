import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const esbuildPath = path.resolve(__dirname, "../artifacts/api-server/node_modules/esbuild/lib/main.js");
const { build } = await import(`file://${esbuildPath.replace(/\\/g, "/")}`);

const testTsPath = path.resolve(__dirname, "test_api_schema.ts");

const result = await build({
  entryPoints: [testTsPath],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});

const code = result.outputFiles[0].text;
const encoded = "data:text/javascript;base64," + Buffer.from(code).toString("base64");
await import(encoded);

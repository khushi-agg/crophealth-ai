// Copies the onnxruntime-web WebAssembly runtime into public/ort so it is served
// (and precached for offline use) from the app's own origin.
import { copyFileSync, mkdirSync } from "node:fs";
const src = "node_modules/onnxruntime-web/dist/";
mkdirSync("public/ort", { recursive: true });
for (const f of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) copyFileSync(src + f, "public/ort/" + f);

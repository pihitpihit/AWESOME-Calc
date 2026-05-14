// data/icons → web/public/icons 복사. 의존성 없음.
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../data/icons");
const dst = resolve(here, "../public/icons");

if (!existsSync(src)) {
  console.error(`[sync-icons] source missing: ${src}`);
  process.exit(1);
}
await rm(dst, { recursive: true, force: true });
await mkdir(dst, { recursive: true });
await cp(src, dst, { recursive: true });
console.log(`[sync-icons] copied ${src} → ${dst}`);

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDir = join(projectRoot, ".sites-build");
const bundleDir = join(outputDir, ".worker-bundle");
const openNextDir = join(projectRoot, ".open-next");

function run(command, args) {
  execFileSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit"
  });
}

function assertNoLinks(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = lstatSync(path);

    if (stats.isSymbolicLink()) {
      throw new Error(`O pacote do Sites não pode conter link simbólico: ${path}`);
    }

    if (stats.isDirectory()) {
      assertNoLinks(path);
    }
  }
}

rmSync(outputDir, { force: true, recursive: true });
run("pnpm", ["opennext:build"]);

mkdirSync(bundleDir, { recursive: true });
run("pnpm", ["exec", "wrangler", "deploy", "--dry-run", "--outdir", bundleDir]);

mkdirSync(join(outputDir, ".open-next"), { recursive: true });
cpSync(join(bundleDir, "worker.js"), join(outputDir, ".open-next", "worker.js"));
cpSync(join(openNextDir, "assets"), join(outputDir, ".open-next", "assets"), {
  recursive: true
});
cpSync(join(projectRoot, ".openai"), join(outputDir, ".openai"), { recursive: true });
cpSync(join(projectRoot, "wrangler.jsonc"), join(outputDir, "wrangler.jsonc"));
rmSync(bundleDir, { force: true, recursive: true });

if (!existsSync(join(outputDir, ".open-next", "worker.js"))) {
  throw new Error("O Wrangler não produziu o Worker compilado.");
}

assertNoLinks(outputDir);
console.log(`Pacote do Sites criado em ${outputDir}`);

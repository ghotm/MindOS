#!/usr/bin/env node
import archiver from 'archiver';
import { createWriteStream, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, resolve } from 'node:path';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const extensionDir = resolve(packageRoot, 'extension');
const outputName = process.argv[2] || 'mindos-web-clipper.zip';
const outputPath = resolve(packageRoot, outputName);

if (!existsSync(resolve(extensionDir, 'manifest.json'))) {
  console.error('[package-extension] Missing extension/manifest.json. Run pnpm run build first.');
  process.exit(1);
}

rmSync(outputPath, { force: true });

const output = createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

await new Promise((resolvePromise, reject) => {
  output.on('close', resolvePromise);
  output.on('error', reject);
  archive.on('warning', reject);
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(extensionDir, false);
  archive.finalize();
});

console.log(`[package-extension] Wrote ${basename(outputPath)} (${archive.pointer()} bytes)`);

#!/usr/bin/env node
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const extensionDir = resolve(packageRoot, 'extension');

rmSync(extensionDir, { recursive: true, force: true });
console.log('[clean-extension] Removed extension/');

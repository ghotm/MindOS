#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const DEFAULT_WEB_PORT = '3456';
const COMMANDS = new Set(['dev', 'start']);

export function resolveWebPort(env = process.env) {
  const raw = env.MINDOS_WEB_PORT;
  if (!raw) return DEFAULT_WEB_PORT;

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return DEFAULT_WEB_PORT;
  return String(port);
}

export function buildNextArgs(command, env = process.env) {
  if (!COMMANDS.has(command)) {
    throw new Error(`Unsupported Next.js command: ${command || '(missing)'}`);
  }

  const args = [command];
  if (command === 'dev') args.push('--webpack');
  args.push('-p', resolveWebPort(env));
  return args;
}

export function run(command = process.argv[2]) {
  let args;
  try {
    args = buildNextArgs(command);
  } catch (error) {
    console.error(`[next-with-port] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const nextBin = require.resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [nextBin, ...args], {
    stdio: 'inherit',
    env: process.env,
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }

  child.on('error', (error) => {
    console.error(`[next-with-port] Failed to start Next.js: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';

if (import.meta.url === entrypoint) {
  run();
}

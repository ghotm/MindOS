import {
  assertWithinRoot as packageAssertWithinRoot,
  resolveSafe as packageResolveSafe,
  isRootProtected as packageIsRootProtected,
  assertNotProtected as packageAssertNotProtected,
} from '@geminilight/mindos';
import fs from 'fs';
import path from 'path';
import { MindOSError, ErrorCodes } from '@/lib/errors';

function isPathWithinRoot(resolved: string, root: string): boolean {
  const normalizedRoot = path.resolve(root);
  const normalizedResolved = path.resolve(resolved);
  const relative = path.relative(normalizedRoot, normalizedResolved);
  return relative === '' || (
    relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function nearestExistingPath(resolved: string): string {
  let current = resolved;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

function toMindOSError(error: unknown, fallbackContext?: Record<string, unknown>): MindOSError {
  if (error instanceof MindOSError) {
    return error;
  }

  const maybeError = error as Error & { context?: Record<string, unknown> };
  return new MindOSError(
    ErrorCodes.PATH_OUTSIDE_ROOT,
    maybeError?.message || 'Access denied: path outside MIND_ROOT',
    maybeError?.context ?? fallbackContext,
  );
}

/**
 * Asserts that a resolved path is within the given root.
 */
export function assertWithinRoot(resolved: string, root: string): void {
  try {
    packageAssertWithinRoot(resolved, root);
  } catch (error) {
    throw toMindOSError(error, { resolved, root });
  }
}

/**
 * Resolves a relative file path against mindRoot and validates it is within bounds.
 * Returns the resolved absolute path.
 */
export function resolveSafe(mindRoot: string, filePath: string): string {
  try {
    return packageResolveSafe(mindRoot, filePath);
  } catch (error) {
    throw toMindOSError(error, { mindRoot, filePath });
  }
}

/**
 * Resolves a path against mindRoot and rejects realpath escapes for the
 * nearest existing file or parent directory.
 */
export function resolveExistingSafe(mindRoot: string, filePath: string): string {
  const resolved = resolveSafe(mindRoot, filePath);
  const existing = nearestExistingPath(resolved);

  let rootReal: string;
  let targetReal: string;
  try {
    rootReal = fs.realpathSync(path.resolve(mindRoot));
    targetReal = fs.realpathSync(existing);
  } catch (error) {
    throw toMindOSError(error, { mindRoot, filePath, resolved, existing });
  }

  if (!isPathWithinRoot(targetReal, rootReal)) {
    throw new MindOSError(
      ErrorCodes.PATH_OUTSIDE_ROOT,
      'Access denied: symlink resolves outside MIND_ROOT',
      { mindRoot, filePath, resolved, existing, targetReal },
    );
  }

  return resolved;
}

/**
 * Checks if a relative file path refers to a root-level protected file.
 */
export function isRootProtected(filePath: string): boolean {
  return packageIsRootProtected(filePath);
}

/**
 * Throws if the file is protected and cannot be modified via automated tools.
 */
export function assertNotProtected(filePath: string, operation: string): void {
  try {
    packageAssertNotProtected(filePath, operation);
  } catch (error) {
    const maybeError = error as Error & { context?: Record<string, unknown> };
    throw new MindOSError(
      ErrorCodes.PROTECTED_FILE,
      maybeError?.message || `Protected file: root "${filePath}" cannot be ${operation} via MCP.`,
      maybeError?.context ?? { filePath, operation },
    );
  }
}

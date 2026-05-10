import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { isPathWithinMindRoot } from '@/lib/sync-config';

describe('sync-config path boundary checks', () => {
  it('allows child paths when mindRoot has a trailing separator', () => {
    const root = path.join(os.tmpdir(), 'mindos-sync-root');

    expect(isPathWithinMindRoot(root + path.sep, 'notes/todo.md')).toBe(true);
  });

  it('allows child paths whose segment starts with consecutive dots', () => {
    const root = path.join(os.tmpdir(), 'mindos-sync-root');

    expect(isPathWithinMindRoot(root, '..notes/todo.md')).toBe(true);
  });

  it('blocks traversal outside mindRoot', () => {
    const root = path.join(os.tmpdir(), 'mindos-sync-root');

    expect(isPathWithinMindRoot(root, '../outside.md')).toBe(false);
  });

  it('blocks Windows-style traversal outside mindRoot on POSIX hosts', () => {
    const root = path.join(os.tmpdir(), 'mindos-sync-root');

    expect(isPathWithinMindRoot(root, '..\\outside.md')).toBe(false);
  });

  it('blocks Windows absolute paths', () => {
    const root = path.join(os.tmpdir(), 'mindos-sync-root');

    expect(isPathWithinMindRoot(root, 'C:\\Users\\alice\\outside.md')).toBe(false);
    expect(isPathWithinMindRoot(root, '\\\\server\\share\\outside.md')).toBe(false);
  });
});

import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('sync-config git subprocess contract', () => {
  it('uses argv-safe git metadata probes', () => {
    const source = readFileSync(path.join(__dirname, '../../lib/sync-config.ts'), 'utf-8');

    expect(source).not.toContain('execSync(');
    expect(source).not.toContain("'git remote get-url origin'");
    expect(source).not.toContain("'git rev-parse --abbrev-ref HEAD'");
    expect(source).not.toContain("'git rev-list --count @{u}..HEAD'");
    expect(source).toContain("execFileSync('git', ['remote', 'get-url', 'origin']");
    expect(source).toContain("execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD']");
    expect(source).toContain("execFileSync('git', ['rev-list', '--count', '@{u}..HEAD']");
  });
});

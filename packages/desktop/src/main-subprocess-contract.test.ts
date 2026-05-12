import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('desktop main subprocess cleanup contract', () => {
  it('uses argv-safe subprocess calls for launchd and systemd cleanup', () => {
    const source = readFileSync(path.join(__dirname, 'main.ts'), 'utf-8');

    expect(source).not.toContain("require('child_process')");
    expect(source).not.toContain('execAsync(');
    expect(source).not.toContain('gui/$(id -u)');
    expect(source).not.toContain('2>/dev/null || true');
    expect(source).not.toContain('pkill -f "');
    expect(source).not.toContain('| xargs kill');
    expect(source).toContain("execFileAsync('launchctl', ['bootout', `gui/${uid}/com.mindos.app`]");
    expect(source).toContain("execFileAsync('pkill', ['-f', 'node_modules/@geminilight/mindos/bin/cli.js start']");
    expect(source).toContain("execFileAsync('systemctl', ['--user', 'is-active', service]");
  });

  it('waits for orphan cleanup before retrying exhausted port discovery', () => {
    const source = readFileSync(path.join(__dirname, 'main.ts'), 'utf-8');

    expect(source).toContain('await ProcessManager.cleanupOrphanedChildren();');
    expect(source).not.toContain('\n    ProcessManager.cleanupOrphanedChildren();');
  });

  it('uses MindOS health payload checks before recovery reloads the Web UI', () => {
    const source = readFileSync(path.join(__dirname, 'main.ts'), 'utf-8');

    expect(source).toContain('verifyMindOsWebHealth(effectiveWebPort, 3000)');
    expect(source).not.toContain("fetch(`http://127.0.0.1:${effectiveWebPort}/api/health`");
  });
});

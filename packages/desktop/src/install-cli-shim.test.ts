import { describe, expect, it, vi } from 'vitest';
import path from 'path';

vi.mock('electron', () => ({
  app: {
    getAppPath: () => process.cwd(),
    getPath: () => path.join(process.cwd(), 'tmp-install-cli-shim-home'),
    isPackaged: false,
  },
  BrowserWindow: class {},
  Notification: class {},
  dialog: {},
}));

describe('install-cli-shim', () => {
  it('escapes Windows batch metacharacters in generated set values', async () => {
    const { escapeCmdSetValue } = await import('./install-cli-shim');

    expect(escapeCmdSetValue('C:\\Users\\A%TEMP%^B!C\\cli.js')).toBe(
      'C:\\Users\\A%%TEMP%%^^B^^!C\\cli.js',
    );
  });

  it('generates a Windows cleanup script without touching the knowledge base', async () => {
    const { buildWindowsUninstallScript } = await import('./install-cli-shim');

    const script = buildWindowsUninstallScript();

    expect(script).toContain('taskkill /PID');
    expect(script).toContain('mindos.cmd');
    expect(script).toContain('[Environment]::SetEnvironmentVariable');
    expect(script).toContain('%~f0');
    expect(script).not.toContain('rmdir /s /q "%USERPROFILE%\\MindOS\\mind"');
    expect(script).not.toContain('del /f /q "%USERPROFILE%\\MindOS\\mind"');
    expect(script).not.toContain('TODO: uninstall.bat');
  });
});

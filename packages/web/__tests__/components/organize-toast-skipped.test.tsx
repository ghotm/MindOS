// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { messages } from '@/lib/i18n';

vi.mock('@/lib/stores/locale-store', () => ({
  useLocale: () => ({
    locale: 'en' as const,
    setLocale: vi.fn(),
    t: messages.en,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

describe('OrganizeToast skipped attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('surfaces oversized attachments that were skipped', async () => {
    const OrganizeToast = (await import('@/components/OrganizeToast')).default;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    const aiOrganize = {
      phase: 'done',
      stageHint: null,
      changes: [{ action: 'create', path: 'Knowledge/ok.md', ok: true, undone: false }],
      skippedAttachments: [{ name: 'huge.md', chars: 25_000, maxChars: 20_000 }],
      sourceFileNames: ['huge.md', 'ok.md'],
      source: 'inbox-organize',
      durationMs: 1200,
      summary: '',
      error: '',
      hasAnyUndoable: false,
      canUndo: () => false,
      undoOne: vi.fn(),
      undoAll: vi.fn(),
      abort: vi.fn(),
      reset: vi.fn(),
      start: vi.fn(),
    };

    await act(async () => {
      root.render(
        <OrganizeToast
          aiOrganize={aiOrganize as React.ComponentProps<typeof OrganizeToast>['aiOrganize']}
          onDismiss={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      await new Promise(r => setTimeout(r, 0));
    });

    // Compact toast keeps skipped files out of the way; expand to inspect details.
    const expand = Array.from(host.querySelectorAll('button'))
      .find(button => button.textContent?.includes(messages.en.fileImport.organizeExpand as string));
    expect(expand).toBeTruthy();

    await act(async () => {
      expand?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 0));
    });

    const text = host.textContent ?? '';
    expect(text).toContain('huge.md');
    expect(text.toLowerCase()).toContain('skipped');

    await act(async () => {
      root.unmount();
    });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMindosHealth, isMindosHealthPayload } from '../../lib/mindos-health';

describe('mindos health helpers', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it('accepts only MindOS health payloads', () => {
    expect(isMindosHealthPayload({ ok: true, service: 'mindos' })).toBe(true);
    expect(isMindosHealthPayload({ ok: true, service: 'other' })).toBe(false);
    expect(isMindosHealthPayload({ ok: false, service: 'mindos' })).toBe(false);
    expect(isMindosHealthPayload(null)).toBe(false);
  });

  it('rejects ok responses from non-MindOS services', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, service: 'other' }),
    });

    await expect(fetchMindosHealth('http://127.0.0.1:3456/api/health')).resolves.toBe(false);
  });

  it('accepts a valid MindOS health response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, service: 'mindos' }),
    });

    await expect(fetchMindosHealth('/api/health')).resolves.toBe(true);
  });
});

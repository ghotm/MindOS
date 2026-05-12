import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectionMonitor } from './connection-monitor';

describe('ConnectionMonitor', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.useRealTimers();
  });

  it('does not restore remote mode for non-MindOS health responses', async () => {
    vi.useFakeTimers();
    const onLost = vi.fn();
    const onRestored = vi.fn();
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, service: 'other' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, service: 'mindos' }),
      });

    const monitor = new ConnectionMonitor('http://192.168.1.100:3456', { onLost, onRestored });
    monitor.start();

    await vi.advanceTimersByTimeAsync(5000);
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(onRestored).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(onRestored).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3000);
    expect(onRestored).toHaveBeenCalledTimes(1);

    monitor.stop();
  });
});

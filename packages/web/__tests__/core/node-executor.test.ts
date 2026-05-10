import { afterEach, describe, expect, it } from 'vitest';
import { getNodeExecutor } from '@/lib/core/node-executor';

const originalMindosNodeBin = process.env.MINDOS_NODE_BIN;

afterEach(() => {
  if (originalMindosNodeBin === undefined) delete process.env.MINDOS_NODE_BIN;
  else process.env.MINDOS_NODE_BIN = originalMindosNodeBin;
});

describe('getNodeExecutor', () => {
  it('uses the MindOS-provided Node binary when available', () => {
    process.env.MINDOS_NODE_BIN = '/opt/mindos/node/bin/node';

    expect(getNodeExecutor()).toBe('/opt/mindos/node/bin/node');
  });

  it('falls back to the current process executable instead of PATH lookup', () => {
    delete process.env.MINDOS_NODE_BIN;

    expect(getNodeExecutor()).toBe(process.execPath);
  });
});

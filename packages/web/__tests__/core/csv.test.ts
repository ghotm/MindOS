import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { mkTempMindRoot, cleanupMindRoot, seedFile, readSeeded } from './helpers';
import { appendCsvRow } from '@/lib/core/csv';

describe('csv', () => {
  let mindRoot: string;

  beforeEach(() => { mindRoot = mkTempMindRoot(); });
  afterEach(() => { cleanupMindRoot(mindRoot); });

  it('appends a simple row', () => {
    seedFile(mindRoot, 'data.csv', 'name,value\n');
    const { newRowCount } = appendCsvRow(mindRoot, 'data.csv', ['foo', 'bar']);
    expect(newRowCount).toBe(2);
    expect(readSeeded(mindRoot, 'data.csv')).toBe('name,value\nfoo,bar\n');
  });

  it('escapes cells with commas', () => {
    seedFile(mindRoot, 'data.csv', 'a,b\n');
    appendCsvRow(mindRoot, 'data.csv', ['hello, world', 'plain']);
    const content = readSeeded(mindRoot, 'data.csv');
    expect(content).toContain('"hello, world"');
  });

  it('escapes cells with quotes (RFC 4180)', () => {
    seedFile(mindRoot, 'data.csv', 'a,b\n');
    appendCsvRow(mindRoot, 'data.csv', ['say "hello"', 'ok']);
    const content = readSeeded(mindRoot, 'data.csv');
    expect(content).toContain('"say ""hello"""');
  });

  it('escapes cells with newlines', () => {
    seedFile(mindRoot, 'data.csv', 'a,b\n');
    appendCsvRow(mindRoot, 'data.csv', ['line1\nline2', 'ok']);
    const content = readSeeded(mindRoot, 'data.csv');
    expect(content).toContain('"line1\nline2"');
  });

  it('creates parent directories if needed', () => {
    appendCsvRow(mindRoot, 'new/dir/data.csv', ['a', 'b']);
    const content = readSeeded(mindRoot, 'new/dir/data.csv');
    expect(content).toBe('a,b\n');
  });

  it('rejects appending through a symlinked parent outside mindRoot', () => {
    const outsideRoot = `${mindRoot}-outside`;
    fs.mkdirSync(outsideRoot, { recursive: true });
    fs.writeFileSync(path.join(outsideRoot, 'data.csv'), 'name,value\n', 'utf-8');
    fs.symlinkSync(outsideRoot, path.join(mindRoot, 'Linked'), 'dir');

    try {
      expect(() => appendCsvRow(mindRoot, 'Linked/data.csv', ['leak', '1'])).toThrow('Access denied');
      expect(fs.readFileSync(path.join(outsideRoot, 'data.csv'), 'utf-8')).toBe('name,value\n');
    } finally {
      fs.rmSync(outsideRoot, { recursive: true, force: true });
    }
  });

  it('throws for non-.csv files', () => {
    seedFile(mindRoot, 'test.md', '');
    expect(() => appendCsvRow(mindRoot, 'test.md', ['a'])).toThrow('.csv');
  });
});

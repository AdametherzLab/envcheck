import { describe, it, expect } from 'bun:test';
import { spawnSync } from 'bun';
import { readFileSync } from 'node:fs';

describe('CLI Schema Generation', () => {
  const CLI_CMD = 'bun ./src/cli.ts';

  it('generates schema from valid input file', () => {
    const result = spawnSync([
      CLI_CMD,
      '--input', './tests/fixtures/valid-schema.ts',
      '--output', './tmp/schema.json'
    ]);

    expect(result.exitCode).toBe(0);
    const output = readFileSync('./tmp/schema.json', 'utf-8');
    expect(JSON.parse(output)).toMatchObject({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: expect.any(Object)
    });
  });

  it('fails with missing input file', () => {
    const result = spawnSync([
      CLI_CMD,
      '--input', './nonexistent.ts',
      '--output', './tmp/schema.json'
    ]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain('failed');
  });

  it('respects strict mode and description', () => {
    const result = spawnSync([
      CLI_CMD,
      '--input', './tests/fixtures/valid-schema.ts',
      '--output', './tmp/strict-schema.json',
      '--strict',
      '--description', 'Test Schema'
    ]);

    expect(result.exitCode).toBe(0);
    const schema = JSON.parse(readFileSync('./tmp/strict-schema.json', 'utf-8'));
    expect(schema.additionalProperties).toBe(false);
    expect(schema.description).toBe('Test Schema');
  });
});

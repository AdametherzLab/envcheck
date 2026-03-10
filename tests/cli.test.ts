import { describe, it, expect } from 'bun:test';
import { spawnSync } from 'bun';
import { readFileSync } from 'node:fs';

describe('CLI Schema Generation', () => {
  const CLI_CMD = 'bun ./src/cli.ts';

  // Existing test cases...

  it('generates .env.example file when --example is provided', () => {
    const result = spawnSync([
      CLI_CMD,
      '--input', './tests/fixtures/valid-schema.ts',
      '--example', './tmp/.env.example'
    ]);

    expect(result.exitCode).toBe(0);
    const exampleContent = readFileSync('./tmp/.env.example', 'utf-8');
    expect(exampleContent).toContain('PORT=3000');
    expect(exampleContent).toContain('API_KEY=');
    expect(exampleContent).toContain('NODE_ENV=');
  });
});

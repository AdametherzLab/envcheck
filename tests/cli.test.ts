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

describe('CLI Check Command', () => {
  const CLI_CMD = 'bun ./src/cli.ts';

  it('passes validation with valid environment variables', () => {
    const result = spawnSync({
      cmd: [CLI_CMD, '--input', './tests/fixtures/valid-schema.ts', '--check'],
      env: { 
        ...process.env, 
        NODE_ENV: 'development',
        API_KEY: 'this-is-a-very-long-api-key-32-chars'
      }
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('✅ Environment validation passed');
  });

  it('fails validation with missing required variables', () => {
    const result = spawnSync({
      cmd: [CLI_CMD, '--input', './tests/fixtures/valid-schema.ts', '--check'],
      env: { 
        ...process.env,
        NODE_ENV: 'development'
        // API_KEY is missing
      }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain('❌ Environment validation failed');
    expect(result.stderr.toString()).toContain('API_KEY');
  });

  it('fails validation with invalid values', () => {
    const result = spawnSync({
      cmd: [CLI_CMD, '--input', './tests/fixtures/valid-schema.ts', '--check'],
      env: { 
        ...process.env,
        NODE_ENV: 'invalid-env',
        API_KEY: 'short'
      }
    });

    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('API_KEY');
    expect(stderr).toContain('minLength');
  });

  it('respects strict mode flag', () => {
    const result = spawnSync({
      cmd: [CLI_CMD, '--input', './tests/fixtures/valid-schema.ts', '--check', '--strict'],
      env: { 
        ...process.env,
        NODE_ENV: 'development',
        API_KEY: 'this-is-a-very-long-api-key-32-chars',
        EXTRA_VAR: 'not-in-schema'
      }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain('EXTRA_VAR');
  });

  it('shows validation summary with all variables on success', () => {
    const result = spawnSync({
      cmd: [CLI_CMD, '--input', './tests/fixtures/valid-schema.ts', '--check'],
      env: { 
        ...process.env, 
        NODE_ENV: 'production',
        API_KEY: 'this-is-a-very-long-api-key-32-chars'
      }
    });

    const stdout = result.stdout.toString();
    expect(stdout).toContain('NODE_ENV');
    expect(stdout).toContain('API_KEY');
    expect(stdout).toContain('PORT');
  });
});

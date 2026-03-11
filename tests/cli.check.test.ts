import { describe, it, expect } from 'bun:test';
import { spawnSync } from 'bun';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('CLI Check Command', () => {
  const CLI_CMD = 'bun';
  const CLI_SCRIPT = './src/cli.ts';
  let tmpDir: string;

  // Setup before each test
  const setupSchema = (content: string, filename = 'test-schema.ts') => {
    tmpDir = join(tmpdir(), 'envcheck-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    mkdirSync(tmpDir, { recursive: true });
    const schemaPath = join(tmpDir, filename);
    writeFileSync(schemaPath, content);
    return schemaPath;
  };

  // Cleanup after each test
  const cleanup = () => {
    try {
      if (tmpDir) {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {}
  };

  it('validates environment successfully with valid variables', () => {
    const schemaContent = `
import { createSchema } from '../../src/index';
export const schema = createSchema({
  PORT: { type: 'port', default: 3000 },
  NODE_ENV: { type: 'enum', choices: ['development', 'production'] as const, default: 'development' }
});
`;
    const schemaPath = setupSchema(schemaContent);

    const result = spawnSync({
      cmd: [CLI_CMD, CLI_SCRIPT, '--input', schemaPath, '--check'],
      env: { ...process.env, PORT: '8080', NODE_ENV: 'production' }
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('✅ Environment validation passed');
    expect(result.stdout.toString()).toContain('PORT: 8080');
    expect(result.stdout.toString()).toContain('NODE_ENV: production');
    cleanup();
  });

  it('fails validation with missing required variables', () => {
    const schemaContent = `
import { createSchema } from '../../src/index';
export const schema = createSchema({
  API_KEY: { type: 'string', required: true },
  PORT: { type: 'port', default: 3000 }
});
`;
    const schemaPath = setupSchema(schemaContent);

    const result = spawnSync({
      cmd: [CLI_CMD, CLI_SCRIPT, '--input', schemaPath, '--check'],
      env: { ...process.env, PORT: '3000' } // API_KEY missing
    });

    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('API_KEY');
    expect(stderr).toContain('Missing required');
    cleanup();
  });

  it('fails validation with invalid values and reports specific errors', () => {
    const schemaContent = `
import { createSchema } from '../../src/index';
export const schema = createSchema({
  PORT: { type: 'port', required: true },
  EMAIL: { type: 'email', required: true }
});
`;
    const schemaPath = setupSchema(schemaContent);

    const result = spawnSync({
      cmd: [CLI_CMD, CLI_SCRIPT, '--input', schemaPath, '--check'],
      env: { ...process.env, PORT: '99999', EMAIL: 'not-an-email' }
    });

    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('PORT');
    expect(stderr).toContain('EMAIL');
    expect(stderr).toContain('Invalid port');
    expect(stderr).toContain('Invalid email');
    cleanup();
  });

  it('uses default values when environment variables are missing', () => {
    const schemaContent = `
import { createSchema } from '../../src/index';
export const schema = createSchema({
  PORT: { type: 'port', default: 3000 },
  DEBUG: { type: 'boolean', default: false }
});
`;
    const schemaPath = setupSchema(schemaContent);

    const result = spawnSync({
      cmd: [CLI_CMD, CLI_SCRIPT, '--input', schemaPath, '--check'],
      env: { ...process.env } // PORT and DEBUG not set
    });

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain('PORT: 3000');
    expect(stdout).toContain('DEBUG: false');
    cleanup();
  });

  it('validates all types correctly with valid inputs', () => {
    const schemaContent = `
import { createSchema } from '../../src/index';
export const schema = createSchema({
  STRING_VAR: { type: 'string', required: true },
  NUMBER_VAR: { type: 'number', required: true },
  BOOL_VAR: { type: 'boolean', required: true },
  ENUM_VAR: { type: 'enum', choices: ['a', 'b', 'c'] as const, required: true },
  EMAIL_VAR: { type: 'email', required: true },
  URL_VAR: { type: 'url', required: true },
  PORT_VAR: { type: 'port', required: true }
});
`;
    const schemaPath = setupSchema(schemaContent);

    const result = spawnSync({
      cmd: [CLI_CMD, CLI_SCRIPT, '--input', schemaPath, '--check'],
      env: { 
        ...process.env, 
        STRING_VAR: 'hello',
        NUMBER_VAR: '42',
        BOOL_VAR: 'true',
        ENUM_VAR: 'b',
        EMAIL_VAR: 'test@example.com',
        URL_VAR: 'https://example.com',
        PORT_VAR: '8080'
      }
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('✅ Environment validation passed');
    cleanup();
  });

  it('respects strict mode and reports extra variables', () => {
    const schemaContent = `
import { createSchema } from '../../src/index';
export const schema = createSchema({
  ALLOWED_VAR: { type: 'string', required: true }
});
`;
    const schemaPath = setupSchema(schemaContent);

    const result = spawnSync({
      cmd: [CLI_CMD, CLI_SCRIPT, '--input', schemaPath, '--check', '--strict'],
      env: { 
        ...process.env, 
        ALLOWED_VAR: 'value',
        EXTRA_VAR: 'should not be here'
      }
    });

    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain('EXTRA_VAR');
    expect(stderr).toContain('strict mode');
    cleanup();
  });
});

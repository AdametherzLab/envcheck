import { describe, it, expect } from 'bun:test';
import { defineEnv, createSchema, exportJsonSchema, generateEnvExample } from '../src/index.ts';
import type { ValidationError } from '../src/index.ts';

describe('JSON Schema Export', () => {
  // Existing test cases...
});

describe('.env.example Generation', () => {
  it('generates basic example with required and optional variables', () => {
    const schema = createSchema({
      PORT: { type: 'port', default: 3000 },
      API_KEY: { type: 'string', required: true },
      DEBUG: { type: 'boolean', required: false, default: false },
    });

    const example = generateEnvExample(schema);
    expect(example).toContain('# Optional, Default: 3000\n# PORT=3000');
    expect(example).toContain('# Required\nAPI_KEY=');
    expect(example).toContain('# Optional, Default: false\n# DEBUG=false');
  });

  it('includes variable descriptions in comments', () => {
    const schema = createSchema({
      EMAIL: { type: 'email', description: 'User email address', required: true },
    });

    const example = generateEnvExample(schema);
    expect(example).toContain('# User email address, Required\nEMAIL=');
  });

  it('handles required variables without defaults', () => {
    const schema = createSchema({
      TOKEN: { type: 'string', required: true },
    });

    const example = generateEnvExample(schema);
    expect(example).toContain('# Required\nTOKEN=');
  });

  it('handles optional variables with defaults', () => {
    const schema = createSchema({
      TIMEOUT: { type: 'number', default: 5000 },
    });

    const example = generateEnvExample(schema);
    expect(example).toContain('# Optional, Default: 5000\n# TIMEOUT=5000');
  });
});

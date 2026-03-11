import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
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

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clone environment to avoid polluting global state
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('validates required string variables', () => {
    process.env.TEST_API_KEY = 'valid-api-key-12345';
    
    const schema = createSchema({
      TEST_API_KEY: { type: 'string', required: true, minLength: 10 }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env.TEST_API_KEY).toBe('valid-api-key-12345');
    }
  });

  it('returns errors for missing required variables', () => {
    delete process.env.MISSING_VAR;
    
    const schema = createSchema({
      MISSING_VAR: { type: 'string', required: true }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].variable).toBe('MISSING_VAR');
      expect(result.errors[0].message).toContain('Missing');
    }
  });

  it('applies default values for missing optional variables', () => {
    delete process.env.OPTIONAL_PORT;
    
    const schema = createSchema({
      OPTIONAL_PORT: { type: 'port', default: 8080 }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env.OPTIONAL_PORT).toBe(8080);
    }
  });

  it('validates port numbers correctly', () => {
    process.env.APP_PORT = '3000';
    
    const schema = createSchema({
      APP_PORT: { type: 'port' }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env.APP_PORT).toBe(3000);
    }
  });

  it('returns errors for invalid port numbers', () => {
    process.env.BAD_PORT = '99999';
    
    const schema = createSchema({
      BAD_PORT: { type: 'port' }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain('Invalid port');
    }
  });

  it('validates enum choices', () => {
    process.env.NODE_ENV = 'production';
    
    const schema = createSchema({
      NODE_ENV: { type: 'enum', choices: ['development', 'production', 'test'] as const }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env.NODE_ENV).toBe('production');
    }
  });

  it('returns errors for invalid enum values', () => {
    process.env.NODE_ENV = 'invalid';
    
    const schema = createSchema({
      NODE_ENV: { type: 'enum', choices: ['development', 'production'] as const }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain('Invalid enum');
    }
  });

  it('validates boolean coercion', () => {
    process.env.ENABLE_DEBUG = 'true';
    process.env.ENABLE_CACHE = '0';
    
    const schema = createSchema({
      ENABLE_DEBUG: { type: 'boolean' },
      ENABLE_CACHE: { type: 'boolean' }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env.ENABLE_DEBUG).toBe(true);
      expect(result.env.ENABLE_CACHE).toBe(false);
    }
  });

  it('detects extra variables in strict mode', () => {
    process.env.ALLOWED_VAR = 'value';
    process.env.EXTRA_VAR = 'should not be here';
    
    const schema = createSchema({
      ALLOWED_VAR: { type: 'string' }
    });

    const result = defineEnv(schema, { strict: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.variable === 'EXTRA_VAR')).toBe(true);
    }
  });

  it('validates email format', () => {
    process.env.USER_EMAIL = 'test@example.com';
    
    const schema = createSchema({
      USER_EMAIL: { type: 'email' }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env.USER_EMAIL).toBe('test@example.com');
    }
  });

  it('returns errors for invalid email format', () => {
    process.env.USER_EMAIL = 'not-an-email';
    
    const schema = createSchema({
      USER_EMAIL: { type: 'email' }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain('Invalid email');
    }
  });

  it('validates URL format', () => {
    process.env.API_URL = 'https://api.example.com';
    
    const schema = createSchema({
      API_URL: { type: 'url', protocols: ['https'] }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env.API_URL).toBe('https://api.example.com');
    }
  });

  it('validates number constraints', () => {
    process.env.MAX_RETRIES = '5';
    
    const schema = createSchema({
      MAX_RETRIES: { type: 'number', min: 1, max: 10, integer: true }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env.MAX_RETRIES).toBe(5);
    }
  });

  it('returns errors for numbers outside constraints', () => {
    process.env.MAX_RETRIES = '15';
    
    const schema = createSchema({
      MAX_RETRIES: { type: 'number', max: 10 }
    });

    const result = defineEnv(schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain('Number too large');
    }
  });
});

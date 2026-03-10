import { describe, it, expect } from 'bun:test';
import { defineEnv, createSchema, exportJsonSchema } from '../src/index.ts';
import type { ValidationError } from '../src/index.ts';

describe('JSON Schema Export', () => {
  it('generates basic schema with scalar types', () => {
    const schema = createSchema({
      PORT: { type: 'number', min: 1, max: 65535, default: 3000 },
      DEBUG: { type: 'boolean', required: false },
      API_KEY: { type: 'string', required: true },
    });

    const jsonSchema = exportJsonSchema(schema);

    expect(jsonSchema).toMatchObject({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      additionalProperties: true,
      required: ['API_KEY'],
      properties: {
        PORT: {
          type: 'number',
          minimum: 1,
          maximum: 65535,
          default: 3000
        },
        DEBUG: {
          type: 'boolean'
        },
        API_KEY: {
          type: 'string'
        }
      }
    });
  });

  it('includes format and constraints for specialized types', () => {
    const schema = createSchema({
      EMAIL: { type: 'email', required: true },
      URL: { type: 'url', protocols: ['https'] },
      ENV: { type: 'enum', choices: ['dev', 'prod'] as const },
    });

    const jsonSchema = exportJsonSchema(schema);

    expect(jsonSchema.properties.EMAIL).toEqual({
      type: 'string',
      format: 'email'
    });

    expect(jsonSchema.required).toContain('EMAIL');

    expect(jsonSchema.properties.URL).toMatchObject({
      type: 'string',
      format: 'uri',
      pattern: '^https:'
    });

    expect(jsonSchema.properties.ENV).toEqual({
      type: 'string',
      enum: ['dev', 'prod']
    });
  });

  it('handles strict mode and required fields', () => {
    const schema = createSchema({
      OPTIONAL: { type: 'string', required: false },
      REQUIRED_NO_DEFAULT: { type: 'number', required: true },
      REQUIRED_WITH_DEFAULT: { type: 'boolean', default: true },
    });

    const strictSchema = exportJsonSchema(schema, { strict: true });
    const laxSchema = exportJsonSchema(schema);

    expect(strictSchema.additionalProperties).toBe(false);
    expect(laxSchema.additionalProperties).toBe(true);
    expect(strictSchema.required).toEqual(['REQUIRED_NO_DEFAULT']);
    expect(laxSchema.required).toEqual(['REQUIRED_NO_DEFAULT']);
  });

  it('handles description and pattern for string types', () => {
    const schema = createSchema({
      UUID: { type: 'string', pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, description: 'Unique identifier' },
      TOKEN: { type: 'string', minLength: 10, maxLength: 50, required: true },
    });

    const jsonSchema = exportJsonSchema(schema);

    expect(jsonSchema.properties.UUID).toMatchObject({
      type: 'string',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      description: 'Unique identifier'
    });

    expect(jsonSchema.properties.TOKEN).toMatchObject({
      type: 'string',
      minLength: 10,
      maxLength: 50
    });
    expect(jsonSchema.required).toContain('TOKEN');
  });

  it('handles integer and port types correctly', () => {
    const schema = createSchema({
      COUNT: { type: 'number', integer: true, min: 0 },
      APP_PORT: { type: 'port', default: 8080 },
    });

    const jsonSchema = exportJsonSchema(schema);

    expect(jsonSchema.properties.COUNT).toMatchObject({
      type: 'integer',
      minimum: 0
    });

    expect(jsonSchema.properties.APP_PORT).toMatchObject({
      type: 'number',
      minimum: 1,
      maximum: 65535,
      default: 8080
    });
  });

  it('generates schema with a global description', () => {
    const schema = createSchema({
      SERVICE_NAME: { type: 'string', default: 'MyService' },
    });

    const jsonSchema = exportJsonSchema(schema, { description: 'Configuration for MyService' });

    expect(jsonSchema.description).toBe('Configuration for MyService');
  });

  it('handles empty schema', () => {
    const schema = createSchema({});
    const jsonSchema = exportJsonSchema(schema);

    expect(jsonSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {},
      additionalProperties: true,
    });
  });
});

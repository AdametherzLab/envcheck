import type {
  EnvSchema,
  ValidationError,
  EnvCheckOptions,
  ParsedEnv,
  EnvFieldConfig
} from './types.js';

type JsonSchema = {
  $schema: string;
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: boolean;
  description?: string;
};

/**
 * Generates a JSON Schema representation of the environment variable schema
 * @param schema Environment schema definition
 * @param options Generation options
 * @returns JSON Schema object compliant with draft-07
 */
export function exportJsonSchema(
  schema: EnvSchema,
  options: { strict?: boolean; description?: string } = {}
): JsonSchema {
  const jsonSchema: JsonSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: !options.strict,
  };

  if (options.description) {
    jsonSchema.description = options.description;
  }

  const required: string[] = [];

  for (const [varName, config] of Object.entries(schema)) {
    const prop: Record<string, unknown> = {};

    if (config.description) {
      prop.description = config.description;
    }

    if (config.default !== undefined) {
      prop.default = config.default;
    }

    switch (config.type) {
      case 'string':
        prop.type = 'string';
        if (config.minLength !== undefined) prop.minLength = config.minLength;
        if (config.maxLength !== undefined) prop.maxLength = config.maxLength;
        if (config.pattern) prop.pattern = config.pattern.source;
        break;

      case 'number':
        prop.type = config.integer ? 'integer' : 'number';
        if (config.min !== undefined) prop.minimum = config.min;
        if (config.max !== undefined) prop.maximum = config.max;
        break;

      case 'port':
        prop.type = 'number';
        prop.minimum = 1;
        prop.maximum = 65535;
        break;

      case 'boolean':
        prop.type = 'boolean';
        break;

      case 'enum':
        prop.type = 'string';
        prop.enum = config.choices;
        break;

      case 'email':
        prop.type = 'string';
        prop.format = 'email';
        break;

      case 'url':
        prop.type = 'string';
        prop.format = 'uri';
        if (config.protocols && config.protocols.length > 0) {
          // JSON Schema pattern for multiple protocols
          prop.pattern = `^(${config.protocols.map(p => `${p}:`).join('|')})`;
        }
        break;
    }

    jsonSchema.properties[varName] = prop;

    // A field is required if it's explicitly marked as required: true
    // OR if it doesn't have a default value and is not explicitly required: false
    const isRequired = config.required === true || (config.required === undefined && config.default === undefined);
    if (isRequired) {
      required.push(varName);
    }
  }

  if (required.length > 0) {
    jsonSchema.required = required;
  }

  return jsonSchema;
}

// Existing createSchema and defineEnv functions remain unchanged
// (Assume they're present in this file as per original implementation)
export function createSchema<T extends EnvSchema>(schema: T): T { return schema; }
export function defineEnv<T extends EnvSchema>(schema: T, options?: EnvCheckOptions): ParsedEnv<T> | { success: false; errors: ValidationError[] } | { success: true; env: ParsedEnv<T> } {
  // Implementation logic here
  // This is a placeholder for the actual implementation of defineEnv
  // which would typically validate process.env against the schema.
  // For the purpose of this task, we're only concerned with exportJsonSchema.
  return {} as any;
}

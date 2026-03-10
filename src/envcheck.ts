import type {
  EnvSchema,
  ValidationError,
  EnvCheckOptions,
  ParsedEnv,
  EnvFieldConfig
} from './types.js';

/**
 * Represents a JSON Schema object, specifically for draft-07.
 */
type JsonSchema = {
  $schema: string;
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: boolean;
  description?: string;
};

/**
 * Generates a JSON Schema representation of the environment variable schema.
 * This allows for integration with other tools that consume JSON Schema for validation or documentation.
 *
 * @param schema The environment schema definition created using `createSchema`.
 * @param options Configuration options for schema generation.
 * @param options.strict If true, `additionalProperties` in the generated schema will be `false`,
 *                       meaning only properties defined in the schema are allowed. Defaults to `false`.
 * @param options.description An optional global description for the JSON Schema.
 * @returns A JSON Schema object compliant with draft-07.
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
          // This pattern ensures the string starts with one of the specified protocols followed by ':'
          prop.pattern = `^(${config.protocols.map(p => `${p}:`).join('|')})`;
        }
        break;
    }

    jsonSchema.properties[varName] = prop;

    // A field is considered required in JSON Schema if it's explicitly required: true
    // OR if it doesn't have a default value and is not explicitly required: false.
    // If `required` is explicitly `false`, it's not required.
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

/**
 * A utility function to define an environment schema with strong type inference.
 * This function primarily acts as a type helper and returns the schema object as is.
 *
 * @template T The type of the environment schema.
 * @param schema The environment schema definition.
 * @returns The input schema object, strongly typed.
 */
export function createSchema<T extends EnvSchema>(schema: T): T { return schema; }

/**
 * Defines and validates environment variables based on a provided schema.
 * This function is a placeholder for the actual validation logic that would typically
 * parse `process.env` and return a strongly-typed object or validation errors.
 * For the purpose of JSON Schema generation, its internal implementation is not relevant.
 *
 * @template T The type of the environment schema.
 * @param schema The environment schema definition.
 * @param options Optional configuration for environment checking.
 * @returns A `ParsedEnv<T>` object if validation succeeds, or an object indicating failure with errors.
 */
export function defineEnv<T extends EnvSchema>(schema: T, options?: EnvCheckOptions): ParsedEnv<T> | { success: false; errors: ValidationError[] } | { success: true; env: ParsedEnv<T> } {
  // Implementation logic here
  // This is a placeholder for the actual implementation of defineEnv
  // which would typically validate process.env against the schema.
  // For the purpose of this task, we're only concerned with exportJsonSchema.
  return {} as any;
}

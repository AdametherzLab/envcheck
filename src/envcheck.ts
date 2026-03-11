import type {
  EnvSchema,
  ValidationError,
  EnvCheckOptions,
  ParsedEnv,
  EnvFieldConfig,
  StringFieldConfig,
  NumberFieldConfig,
  BooleanFieldConfig,
  EnumFieldConfig,
  UrlFieldConfig,
  EmailFieldConfig,
  PortFieldConfig,
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

type ValidationResult = 
  | { success: true; value: unknown }
  | { success: false; error: ValidationError };

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
 * Generates a .env.example file content based on the environment schema.
 * Includes comments with descriptions and default values where available.
 *
 * @param schema The environment schema definition created using `createSchema`.
 * @returns A string containing the generated .env.example content.
 */
export function generateEnvExample(schema: EnvSchema): string {
  const lines: string[] = [];

  for (const [varName, config] of Object.entries(schema)) {
    const commentParts: string[] = [];
    const isRequired = config.required === true || (config.required === undefined && config.default === undefined);

    if (config.description) {
      commentParts.push(config.description);
    }
    commentParts.push(isRequired ? 'Required' : 'Optional');
    
    if (config.default !== undefined) {
      commentParts.push(`Default: ${config.default}`);
    }

    const commentLine = `# ${commentParts.join(', ')}`;
    lines.push(commentLine);

    let varLine = `${varName}=${config.default ?? ''}`;
    if (!isRequired) {
      varLine = `# ${varLine}`;
    }
    lines.push(varLine);
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
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

function validateString(varName: string, value: string, config: StringFieldConfig): ValidationResult {
  if (config.minLength !== undefined && value.length < config.minLength) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: `string with minLength ${config.minLength}`,
        received: value,
        message: `String too short: expected at least ${config.minLength} characters, got ${value.length}`
      }
    };
  }
  
  if (config.maxLength !== undefined && value.length > config.maxLength) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: `string with maxLength ${config.maxLength}`,
        received: value,
        message: `String too long: expected at most ${config.maxLength} characters, got ${value.length}`
      }
    };
  }
  
  if (config.pattern && !config.pattern.test(value)) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: `string matching pattern ${config.pattern.source}`,
        received: value,
        message: `String does not match required pattern`
      }
    };
  }
  
  if (config.validate) {
    const validation = config.validate(value);
    if (validation !== true) {
      return {
        success: false,
        error: {
          variable: varName,
          expected: 'string (custom validation)',
          received: value,
          message: typeof validation === 'string' ? validation : 'Custom validation failed'
        }
      };
    }
  }
  
  return { success: true, value };
}

function validateNumber(varName: string, value: string, config: NumberFieldConfig): ValidationResult {
  const num = Number(value);
  if (isNaN(num)) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: 'number',
        received: value,
        message: `Invalid number: "${value}" is not a valid number`
      }
    };
  }
  
  if (config.integer && !Number.isInteger(num)) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: 'integer',
        received: value,
        message: `Invalid integer: "${value}" is not an integer`
      }
    };
  }
  
  if (config.min !== undefined && num < config.min) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: `number >= ${config.min}`,
        received: value,
        message: `Number too small: expected >= ${config.min}, got ${num}`
      }
    };
  }
  
  if (config.max !== undefined && num > config.max) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: `number <= ${config.max}`,
        received: value,
        message: `Number too large: expected <= ${config.max}, got ${num}`
      }
    };
  }
  
  if (config.validate) {
    const validation = config.validate(num);
    if (validation !== true) {
      return {
        success: false,
        error: {
          variable: varName,
          expected: 'number (custom validation)',
          received: value,
          message: typeof validation === 'string' ? validation : 'Custom validation failed'
        }
      };
    }
  }
  
  return { success: true, value: num };
}

function validateBoolean(varName: string, value: string, config: BooleanFieldConfig): ValidationResult {
  const lower = value.toLowerCase();
  const validTrue = ['true', '1', 'yes'];
  const validFalse = ['false', '0', 'no'];
  
  if (validTrue.includes(lower)) {
    const result: ValidationResult = { success: true, value: true };
    if (config.validate) {
      const validation = config.validate(true);
      if (validation !== true) {
        return {
          success: false,
          error: {
            variable: varName,
            expected: 'boolean (custom validation)',
            received: value,
            message: typeof validation === 'string' ? validation : 'Custom validation failed'
          }
        };
      }
    }
    return result;
  }
  
  if (validFalse.includes(lower)) {
    const result: ValidationResult = { success: true, value: false };
    if (config.validate) {
      const validation = config.validate(false);
      if (validation !== true) {
        return {
          success: false,
          error: {
            variable: varName,
            expected: 'boolean (custom validation)',
            received: value,
            message: typeof validation === 'string' ? validation : 'Custom validation failed'
          }
        };
      }
    }
    return result;
  }
  
  return {
    success: false,
    error: {
      variable: varName,
      expected: 'boolean (true/false/1/0/yes/no)',
      received: value,
      message: `Invalid boolean: "${value}" is not a valid boolean value`
    }
  };
}

function validateEnum(varName: string, value: string, config: EnumFieldConfig): ValidationResult {
  if (!config.choices.includes(value)) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: `one of [${config.choices.join(', ')}]`,
        received: value,
        message: `Invalid enum value: "${value}" is not one of the allowed choices`
      }
    };
  }
  
  if (config.validate) {
    const validation = config.validate(value);
    if (validation !== true) {
      return {
        success: false,
        error: {
          variable: varName,
          expected: 'enum (custom validation)',
          received: value,
          message: typeof validation === 'string' ? validation : 'Custom validation failed'
        }
      };
    }
  }
  
  return { success: true, value };
}

function validateUrl(varName: string, value: string, config: UrlFieldConfig): ValidationResult {
  try {
    const url = new URL(value);
    if (config.protocols && config.protocols.length > 0) {
      const protocol = url.protocol.slice(0, -1); // Remove trailing colon
      if (!config.protocols.includes(protocol)) {
        return {
          success: false,
          error: {
            variable: varName,
            expected: `URL with protocol one of [${config.protocols.join(', ')}]`,
            received: value,
            message: `Invalid URL protocol: expected one of [${config.protocols.join(', ')}], got ${protocol}`
          }
        };
      }
    }
    
    if (config.validate) {
      const validation = config.validate(value);
      if (validation !== true) {
        return {
          success: false,
          error: {
            variable: varName,
            expected: 'URL (custom validation)',
            received: value,
            message: typeof validation === 'string' ? validation : 'Custom validation failed'
          }
        };
      }
    }
    
    return { success: true, value };
  } catch {
    return {
      success: false,
      error: {
        variable: varName,
        expected: 'valid URL',
        received: value,
        message: `Invalid URL: "${value}" is not a valid URL`
      }
    };
  }
}

function validateEmail(varName: string, value: string, config: EmailFieldConfig): ValidationResult {
  // Simple email regex that checks for @ and domain
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: 'valid email address',
        received: value,
        message: `Invalid email: "${value}" is not a valid email address`
      }
    };
  }
  
  if (config.validate) {
    const validation = config.validate(value);
    if (validation !== true) {
      return {
        success: false,
        error: {
          variable: varName,
          expected: 'email (custom validation)',
          received: value,
          message: typeof validation === 'string' ? validation : 'Custom validation failed'
        }
      };
    }
  }
  
  return { success: true, value };
}

function validatePort(varName: string, value: string, config: PortFieldConfig): ValidationResult {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > 65535) {
    return {
      success: false,
      error: {
        variable: varName,
        expected: 'valid port number (1-65535)',
        received: value,
        message: `Invalid port: "${value}" is not a valid port number (must be integer 1-65535)`
      }
    };
  }
  
  if (config.validate) {
    const validation = config.validate(num);
    if (validation !== true) {
      return {
        success: false,
        error: {
          variable: varName,
          expected: 'port (custom validation)',
          received: value,
          message: typeof validation === 'string' ? validation : 'Custom validation failed'
        }
      };
    }
  }
  
  return { success: true, value: num };
}

/**
 * Validates environment variables against a schema.
 * 
 * @param schema The environment schema definition created using `createSchema`.
 * @param options Configuration options for validation.
 * @returns An object indicating success with the parsed environment, or failure with validation errors.
 */
export function defineEnv<T extends EnvSchema>(
  schema: T,
  options: EnvCheckOptions = {}
): { success: true; env: ParsedEnv<T> } | { success: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const env = {} as Record<string, unknown>;
  
  // Check for strict mode - extra variables not in schema
  if (options.strict) {
    const schemaKeys = new Set(Object.keys(schema));
    const prefix = options.prefix || '';
    
    for (const key of Object.keys(process.env)) {
      const unprefixedKey = prefix && key.startsWith(prefix) ? key.slice(prefix.length) : key;
      if (!schemaKeys.has(unprefixedKey)) {
        errors.push({
          variable: key,
          expected: 'not present (strict mode)',
          received: process.env[key] || '',
          message: `Extra environment variable not defined in schema: ${key}`
        });
      }
    }
  }
  
  for (const [varName, config] of Object.entries(schema)) {
    const envKey = options.prefix ? `${options.prefix}${varName}` : varName;
    const rawValue = process.env[envKey];
    
    // Determine if required: explicit true, or undefined with no default
    const isRequired = config.required === true || (config.required === undefined && config.default === undefined);
    
    if (rawValue === undefined || rawValue === '') {
      if (config.default !== undefined) {
        env[varName] = config.default;
      } else if (isRequired) {
        errors.push({
          variable: varName,
          expected: config.type,
          received: rawValue === undefined ? 'undefined' : 'empty string',
          message: `Missing required environment variable: ${varName}`
        });
      } else {
        env[varName] = undefined;
      }
      continue;
    }
    
    // Validate based on type
    let result: ValidationResult;
    
    switch (config.type) {
      case 'string':
        result = validateString(varName, rawValue, config);
        break;
      case 'number':
        result = validateNumber(varName, rawValue, config);
        break;
      case 'boolean':
        result = validateBoolean(varName, rawValue, config);
        break;
      case 'enum':
        result = validateEnum(varName, rawValue, config);
        break;
      case 'url':
        result = validateUrl(varName, rawValue, config);
        break;
      case 'email':
        result = validateEmail(varName, rawValue, config);
        break;
      case 'port':
        result = validatePort(varName, rawValue, config);
        break;
      default:
        result = { 
          success: false, 
          error: { 
            variable: varName, 
            expected: 'unknown type', 
            received: rawValue, 
            message: `Unknown type configuration for ${varName}` 
          } 
        };
    }
    
    if (result.success) {
      env[varName] = result.value;
    } else {
      errors.push(result.error);
    }
  }
  
  if (errors.length > 0) {
    if (options.onValidationFailed) {
      options.onValidationFailed(errors);
    }
    return { success: false, errors };
  }
  
  return { success: true, env: env as ParsedEnv<T> };
}

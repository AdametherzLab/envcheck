/**
 * Structured error information for a single environment variable validation failure.
 */
export interface ValidationError {
  /** The name of the environment variable that failed validation. */
  readonly variable: string;
  /** Description of the expected type or format. */
  readonly expected: string;
  /** The actual value received (or 'undefined' if missing). */
  readonly received: string;
  /** Human-readable error message describing the failure. */
  readonly message: string;
}

/**
 * Runtime configuration options for environment variable validation.
 */
export interface EnvCheckOptions {
  /** If true, reject environment variables present in process.env but not defined in schema. */
  readonly strict?: boolean;
  /** Optional prefix to strip from variable names (e.g., 'APP_' converts APP_PORT to port). */
  readonly prefix?: string;
  /** Custom handler called when validation fails. If not provided, throws aggregate error. */
  readonly onValidationFailed?: (errors: readonly ValidationError[]) => void;
}

/**
 * Base configuration shared by all environment variable types.
 */
interface BaseFieldConfig<TType extends string, TValue> {
  /** Discriminant indicating the expected runtime type. */
  readonly type: TType;
  /** 
   * Whether the variable must be present in the environment. 
   * Defaults to true unless a default value is provided.
   */
  readonly required?: boolean;
  /** Default value used when the environment variable is not set. */
  readonly default?: TValue;
  /** Human-readable description for documentation and error messages. */
  readonly description?: string;
  /** 
   * Custom validation function. Return true if valid, or a string error message if invalid.
   */
  readonly validate?: (value: TValue) => boolean | string;
}

/**
 * String environment variable configuration.
 */
export interface StringFieldConfig extends BaseFieldConfig<'string', string> {
  readonly type: 'string';
  /** Minimum allowed string length. */
  readonly minLength?: number;
  /** Maximum allowed string length. */
  readonly maxLength?: number;
  /** RegExp pattern the value must match. */
  readonly pattern?: RegExp;
}

/**
 * Numeric environment variable configuration.
 */
export interface NumberFieldConfig extends BaseFieldConfig<'number', number> {
  readonly type: 'number';
  /** Minimum allowed numeric value. */
  readonly min?: number;
  /** Maximum allowed numeric value. */
  readonly max?: number;
  /** If true, value must be an integer. */
  readonly integer?: boolean;
}

/**
 * Boolean environment variable configuration.
 * Accepts 'true', 'false', '1', '0', 'yes', 'no' (case-insensitive).
 */
export interface BooleanFieldConfig extends BaseFieldConfig<'boolean', boolean> {
  readonly type: 'boolean';
}

/**
 * Enum environment variable configuration.
 * Value must be one of the provided choices.
 */
export interface EnumFieldConfig extends BaseFieldConfig<'enum', string> {
  readonly type: 'enum';
  /** Allowed string values for this variable. */
  readonly choices: readonly string[];
}

/**
 * URL environment variable configuration.
 * Validates that the value is a valid URL.
 */
export interface UrlFieldConfig extends BaseFieldConfig<'url', string> {
  readonly type: 'url';
  /** Allowed protocols (e.g., ['https', 'http']). If omitted, any protocol is accepted. */
  readonly protocols?: readonly string[];
}

/**
 * Email environment variable configuration.
 * Validates that the value is a valid email address format.
 */
export interface EmailFieldConfig extends BaseFieldConfig<'email', string> {
  readonly type: 'email';
}

/**
 * Port number environment variable configuration.
 * Validates that the number is a valid TCP/UDP port (1-65535).
 */
export interface PortFieldConfig extends BaseFieldConfig<'port', number> {
  readonly type: 'port';
}

/**
 * Discriminated union of all possible field configurations.
 * Use the `type` property to narrow to a specific configuration type.
 */
export type EnvFieldConfig =
  | StringFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | EnumFieldConfig
  | UrlFieldConfig
  | EmailFieldConfig
  | PortFieldConfig;

/**
 * Schema definition mapping environment variable names to their validation configurations.
 */
export type EnvSchema = Record<string, EnvFieldConfig>;

/**
 * Infers the TypeScript type for a single field configuration.
 * @internal
 */
export type InferFieldType<T extends EnvFieldConfig> =
  T extends StringFieldConfig ? string :
  T extends NumberFieldConfig ? number :
  T extends BooleanFieldConfig ? boolean :
  T extends EnumFieldConfig ? T['choices'][number] :
  T extends UrlFieldConfig ? string :
  T extends EmailFieldConfig ? string :
  T extends PortFieldConfig ? number :
  never;

/**
 * Determines if a field configuration includes a default value.
 * @internal
 */
export type HasDefault<T extends EnvFieldConfig> = 
  T extends { default: infer D } ? (D extends undefined ? false : true) : false;

/**
 * Infers the final type for a field in the parsed environment.
 * Returns the base type if the field has a default or is required, 
 * otherwise unions with undefined.
 * @internal
 */
export type ParsedEnvField<T extends EnvFieldConfig> =
  HasDefault<T> extends true
    ? InferFieldType<T>
    : T['required'] extends false
      ? InferFieldType<T> | undefined
      : InferFieldType<T>;

/**
 * Maps an environment schema to a strongly-typed parsed environment object.
 * All properties are readonly.
 * 
 * @example
 * const schema = {
 *   PORT: { type: 'port', default: 3000 },
 *   DEBUG: { type: 'boolean', required: false },
 *   NODE_ENV: { type: 'enum', choices: ['development', 'production'] as const }
 * } satisfies EnvSchema;
 * 
 * type Config = ParsedEnv<typeof schema>;
 * // Config = { 
 * //   readonly PORT: number; 
 * //   readonly DEBUG: boolean | undefined; 
 * //   readonly NODE_ENV: 'development' | 'production';
 * // }
 */
export type ParsedEnv<T extends EnvSchema> = {
  readonly [K in keyof T]: ParsedEnvField<T[K]>;
};
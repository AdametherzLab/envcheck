/**
 * Public API barrel file for envcheck.
 * Re-exports all public types and functions from internal modules.
 * @module envcheck
 */

export type {
  ValidationError,
  EnvCheckOptions,
  StringFieldConfig,
  NumberFieldConfig,
  BooleanFieldConfig,
  EnumFieldConfig,
  UrlFieldConfig,
  EmailFieldConfig,
  PortFieldConfig,
  EnvFieldConfig,
  EnvSchema,
  InferFieldType,
  HasDefault,
  ParsedEnvField,
  ParsedEnv,
} from './types.js';

export { createSchema, defineEnv, exportJsonSchema, generateEnvExample } from './envcheck.js';

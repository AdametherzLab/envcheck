# envcheck 🔐

[![CI](https://github.com/AdametherzLab/envcheck/actions/workflows/ci.yml/badge.svg)](https://github.com/AdametherzLab/envcheck/actions) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- ✅ **Type-safe by default** — Your env vars are fully typed with zero manual type definitions
- 🚀 **Fail-fast validation** — Catches all missing/invalid variables at startup, not mid-request  
- 🎯 **Zero dependencies** — Lightweight, using only Node.js/Bun built-ins
- 🔧 **Rich type support** — Strings, numbers, booleans, enums, URLs, emails, and ports with intelligent coercion
- 🛡️ **Aggregate error reporting** — See every validation failure at once, not one-by-one

## Installation

```bash
# npm
npm install @adametherzlab/envcheck

# yarn  
yarn add @adametherzlab/envcheck

# pnpm
pnpm add @adametherzlab/envcheck

# bun
bun add @adametherzlab/envcheck
```

## Quick Start

```typescript
// REMOVED external import: import { defineEnv } from '@adametherzlab/envcheck';

const env = defineEnv({
  DATABASE_URL: { type: 'url', protocols: ['postgres', 'postgresql'] },
  PORT: { type: 'port', default: 3000 },
  DEBUG: { type: 'boolean', default: false },
  NODE_ENV: { 
    type: 'enum', 
    choices: ['development', 'production', 'test'] as const,
    default: 'development'
  }
});

// env is fully typed!
console.log(env.PORT); // number, defaults to 3000
console.log(env.NODE_ENV); // 'development' | 'production' | 'test'
```

## API Reference

### `defineEnv<T extends EnvSchema>(schema, options?)`

Validates `process.env` against your schema and returns a typed, readonly object.

**Parameters:**
- `schema: T` — Object mapping env var names to field configurations
- `options?: EnvCheckOptions` — Validation behavior overrides

**Returns:** `ParsedEnv<T>` — Frozen object with typed values

**Throws:** `AggregateError` containing all `ValidationError` objects if validation fails and no `onError` handler is provided

```typescript
const env = defineEnv({
  API_KEY: { type: 'string', minLength: 32 },
  LOG_LEVEL: { type: 'enum', choices: ['debug', 'info', 'warn', 'error'] as const }
}, {
  strict: true, // Fail on unknown env vars
  onError: (errors) => {
    console.error('Config failed:', errors.map(e => `${e.field}: ${e.message}`));
    process.exit(1);
  }
});
```

### `createSchema<T extends EnvSchema>(schema)`

**Parameters:**
- `schema: T` — Schema definition object

**Returns:** `T` — Same schema, with types preserved for inference

```typescript
const schema = createSchema({
  REDIS_URL: { type: 'url', default: 'redis://localhost:6379' }
});

const env = defineEnv(schema); // env.REDIS_URL is string
```

### Field Configuration Types

- `required?: boolean` — Defaults to `true`. Set to `false` to allow undefined
- `default?: T` — Fallback value (makes field non-optional in return type)

**StringFieldConfig**
```typescript
{ type: 'string', minLength?: number, maxLength?: number, pattern?: RegExp }
```

**NumberFieldConfig**  
```typescript
{ type: 'number', min?: number, max?: number }
```

**BooleanFieldConfig**
```typescript
{ type: 'boolean' } // Accepts: 'true', 'false', '1', '0', 'yes', 'no' (case-insensitive)
```

**EnumFieldConfig**
```typescript
{ type: 'enum', choices: readonly string[] }
```

**UrlFieldConfig**
```typescript
{ type: 'url', protocols?: string[] } // Validates URL format, optionally restricts protocol
```

**EmailFieldConfig**
```typescript
{ type: 'email' } // Validates email format (RFC 5322 compliant)
```

**PortFieldConfig**
```typescript
{ type: 'port' } // Validates 1-65535, coerces string to number
```

### EnvCheckOptions

```typescript
interface EnvCheckOptions {
  /** Strip prefix from env var names (e.g., 'APP_' to read APP_PORT as PORT) */
  prefix?: string;
  /** Throw error if process.env contains keys not in schema */
  strict?: boolean;
  /** Custom error handler instead of throwing AggregateError */
  onError?: (errors: ValidationError[]) => void | never;
}
```

### ValidationError

```typescript
interface ValidationError {
  field: string;      // Env var name
  type: string;       // Expected type ('url', 'port', etc.)
  value: string | undefined;
  message: string;    // Human-readable description
}
```

## TypeScript Inference

```typescript
const schema = {
  HOST: { type: 'string', default: 'localhost' },
  PORT: { type: 'port', required: false }, // Optional
  MODE: { type: 'enum', choices: ['fast', 'slow'] as const }
} as const;

const env = defineEnv(schema);

// Type inference:
// env.HOST: string (not string | undefined, thanks to default)
// env.PORT: number | undefined (optional)
// env.MODE: 'fast' | 'slow' (literal union)
```

## Common Pitfalls

### Boolean Coercion
Don't assume JavaScript truthiness! `'false'` is a truthy string. Envcheck handles this correctly:

```typescript
// ❌ Wrong: process.env.DEBUG = 'false' becomes true
const debug = !!process.env.DEBUG;

// ✅ Right: envcheck parses 'false' to boolean false
const { DEBUG } = defineEnv({ DEBUG: { type: 'boolean', default: false }});
```

### Required vs Optional
A field is **required by default**. To make it optional, explicitly set `required: false`:

```typescript
defineEnv({
  MUST_HAVE: { type: 'string' },           // Required
  NICE_TO_HAVE: { type: 'string', required: false }, // Optional
  WITH_DEFAULT: { type: 'string', default: 'foo' }   // Required (has fallback)
});
```

### The `as const` Assertion
When using `choices` for enums, use `as const` to get literal type inference:

```typescript
// ❌ Without as const: choices is string[], so type is string
// ✅ With as const: type is 'prod' | 'dev'
choices: ['prod', 'dev'] as const
```

## Advanced Usage

```typescript
const env = defineEnv({
  DATABASE_URL: { type: 'url', protocols: ['postgres'] },
  POOL_SIZE: { type: 'number', min: 1, max: 100, default: 10 },
  ENABLE_METRICS: { type: 'boolean', default: false }
}, {
  prefix: 'APP_', // Reads APP_DATABASE_URL from process.env
  strict: true,   // Rejects stray env vars (typo protection)
  onError: (errors) => {
    console.error('🔥 Environment validation failed:');
    errors.forEach(e => console.error(`  ${e.field}: ${e.message}`));
    process.exit(1);
  }
});
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT (c) [AdametherzLab](https://github.com/AdametherzLab)
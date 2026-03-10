# envcheck 🔐

[![CI](https://github.com/AdametherzLab/envcheck/actions/workflows/ci.yml/badge.svg)](https://github.com/AdametherzLab/envcheck/actions) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- ✅ **Type-safe by default** — Your env vars are fully typed with zero manual type definitions
- 🚀 **Fail-fast validation** — Catches all missing/invalid variables at startup, not mid-request  
- 🎯 **Zero dependencies** — Lightweight, using only Node.js/Bun built-ins
- 🔧 **Rich type support** — Strings, numbers, booleans, enums, URLs, emails, and ports with intelligent coercion
- 🛡️ **Aggregate error reporting** — See every validation failure at once, not one-by-one
- 📦 **JSON Schema CLI** — Generate JSON Schema files directly from your TypeScript definitions

## Installation

bash
# npm
npm install @adametherzlab/envcheck

# yarn  
yarn add @adametherzlab/envcheck

# pnpm
pnpm add @adametherzlab/envcheck

# bun
bun add @adametherzlab/envcheck


## CLI Usage

Generate JSON Schema from your TypeScript environment schema:

bash
envcheck generate-schema \
  --input ./src/env-schema.ts \
  --output env-schema.json

# With strict mode and description
envcheck generate-schema \
  -i schema.ts \
  -o schema.json \
  --strict \
  --description "Production Environment"


## API Usage


import { createSchema, defineEnv, exportJsonSchema } from '@adametherzlab/envcheck';

const schema = createSchema({
  PORT: { type: 'port', default: 3000 },
  NODE_ENV: { type: 'enum', choices: ['dev', 'prod'] as const },
  API_KEY: { type: 'string', required: true }
});

// Generate JSON Schema
const jsonSchema = exportJsonSchema(schema, {
  strict: true,
  description: 'App Configuration'
});

// Validate environment
const result = defineEnv(schema);
if (!result.success) {
  console.error('Validation errors:', result.errors);
  process.exit(1);
}

const { env } = result;
console.log('Server port:', env.PORT);


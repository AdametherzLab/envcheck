# envcheck 🔐

[![CI](https://github.com/AdametherzLab/envcheck/actions/workflows/ci.yml/badge.svg)](https://github.com/AdametherzLab/envcheck/actions) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- ✅ **Type-safe by default** — Your env vars are fully typed with zero manual type definitions
- 🚀 **Fail-fast validation** — Catches all missing/invalid variables at startup, not mid-request  
- 🎯 **Zero dependencies** — Lightweight, using only Node.js/Bun built-ins
- 🔧 **Rich type support** — Strings, numbers, booleans, enums, URLs, emails, and ports with intelligent coercion
- 🛡️ **Aggregate error reporting** — See every validation failure at once, not one-by-one
- 📦 **JSON Schema CLI** — Generate JSON Schema files directly from your TypeScript definitions
- 🚀 **Automatic .env.example** — Generate developer-friendly .env.example files with documented variables

## Installation

bash
# npm
npm install @adametherzlab/envcheck

# yarn  
yarn add @adametherzlab/envcheck


## Usage


import { createSchema, defineEnv } from '@adametherzlab/envcheck';

const schema = createSchema({
  PORT: { type: 'port', default: 3000 },
  NODE_ENV: { type: 'enum', choices: ['development', 'production'] as const },
  API_KEY: { type: 'string', required: true, minLength: 32 }
});

const result = defineEnv(schema);

if (!result.success) {
  console.error('Environment validation failed:', result.errors);
  process.exit(1);
}

console.log('Server running on port', result.env.PORT);


## CLI Usage

Generate JSON Schema from your environment schema:

bash
bun ./src/cli.ts --input ./path/to/schema.ts --output env-schema.json


Generate .env.example file:

bash
bun ./src/cli.ts --input ./path/to/schema.ts --example .env.example


## Generating .env.example

The generated .env.example file includes:
- All environment variables from your schema
- Comments denoting required/optional status
- Default values where specified
- Optional variables commented out for easy configuration

Example output:
env
# Port number, Optional, Default: 3000
# PORT=3000

# API key, Required
API_KEY=

# Environment, Required
NODE_ENV=


#!/usr/bin/env bun
import { defineEnv } from '../envcheck';
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { highlight } from 'cli-highlight';

const { values: args } = parseArgs({
  options: {
    schema: { type: 'string', short: 's', default: './env.schema.ts' },
    strict: { type: 'boolean' },
    colors: { type: 'boolean', default: true }
  }
});

async function main() {
  try {
    const schemaModule = await import(args.schema);
    const result = defineEnv(schemaModule.schema, {
      strict: args.strict
    });

    if (!result.success) {
      console.error('❌ Environment validation failed:\n');
      result.errors.forEach(error => {
        console.error(`  ${error.variable}:`);
        console.error(`    Expected: ${highlight(error.expected, { language: 'json', theme: 'github' })}`);
        console.error(`    Received: ${highlight(error.received, { language: 'json', theme: 'github' })}`);
      });
      process.exit(1);
    }

    console.log('✅ All environment variables are valid!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Validation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

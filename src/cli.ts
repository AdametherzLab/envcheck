#!/usr/bin/env bun
import { exportJsonSchema } from './envcheck';
import { createSchema } from './index';
import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';

const { values: args } = parseArgs({
  options: {
    input: { type: 'string', short: 'i', required: true },
    output: { type: 'string', short: 'o', required: true },
    strict: { type: 'boolean', short: 's' },
    description: { type: 'string', short: 'd' }
  },
  allowPositionals: true
});

async function main() {
  if (!args.input || !args.output) {
    console.error('Missing required --input or --output arguments');
    process.exit(1);
  }

  try {
    const userModule = await import(args.input);
    const schema = userModule.schema ?? createSchema(userModule.default);
    
    const jsonSchema = exportJsonSchema(schema, {
      strict: args.strict,
      description: args.description
    });

    writeFileSync(args.output, JSON.stringify(jsonSchema, null, 2));
    console.log(`✅ Successfully generated JSON Schema at ${args.output}`);
  } catch (error) {
    console.error('❌ Schema generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

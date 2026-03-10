#!/usr/bin/env bun
import { exportJsonSchema, generateEnvExample } from './envcheck';
import { createSchema } from './index';
import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';

const { values: args } = parseArgs({
  options: {
    input: { type: 'string', short: 'i', required: true },
    output: { type: 'string', short: 'o' },
    example: { type: 'string', short: 'e' },
    strict: { type: 'boolean', short: 's' },
    description: { type: 'string', short: 'd' }
  },
  allowPositionals: true
});

async function main() {
  if (!args.input || (!args.output && !args.example)) {
    console.error('Missing required arguments: --input and at least one of --output or --example');
    process.exit(1);
  }

  try {
    const userModule = await import(args.input);
    const schema = userModule.schema ?? createSchema(userModule.default);
    
    if (args.output) {
      const jsonSchema = exportJsonSchema(schema, {
        strict: args.strict,
        description: args.description
      });
      writeFileSync(args.output, JSON.stringify(jsonSchema, null, 2));
      console.log(`✅ Successfully generated JSON Schema at ${args.output}`);
    }

    if (args.example) {
      const envExample = generateEnvExample(schema);
      writeFileSync(args.example, envExample);
      console.log(`✅ Successfully generated .env.example at ${args.example}`);
    }
  } catch (error) {
    console.error('❌ Schema generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

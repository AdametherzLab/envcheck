#!/usr/bin/env bun
import { exportJsonSchema, generateEnvExample, defineEnv } from './envcheck';
import { createSchema } from './index';
import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import { runInteractive } from './cli/interactive';

const { values: args } = parseArgs({
  options: {
    input: { type: 'string', short: 'i' },
    output: { type: 'string', short: 'o' },
    example: { type: 'string', short: 'e' },
    strict: { type: 'boolean', short: 's' },
    description: { type: 'string', short: 'd' },
    interactive: { type: 'boolean', short: 'c' },
    check: { type: 'boolean' }
  },
  allowPositionals: true
});

async function runCheck(inputPath: string, strict?: boolean) {
  try {
    const userModule = await import(inputPath);
    const schema = userModule.schema ?? createSchema(userModule.default);
    
    const result = defineEnv(schema, { strict });
    
    if (!result.success) {
      console.error('❌ Environment validation failed:');
      console.error('');
      for (const error of result.errors) {
        console.error(`  • ${error.variable}: ${error.message}`);
        console.error(`    Expected: ${error.expected}`);
        console.error(`    Received: ${error.received}`);
        console.error('');
      }
      process.exit(1);
    }
    
    console.log('✅ Environment validation passed!');
    console.log('');
    console.log('Validated variables:');
    for (const [key, value] of Object.entries(result.env)) {
      const displayValue = value === undefined ? 'undefined' : String(value);
      console.log(`  • ${key}: ${displayValue}`);
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function main() {
  if (args.interactive || Object.keys(args).length === 0) {
    return runInteractive();
  }

  if (args.check) {
    if (!args.input) {
      console.error('Missing required argument: --input');
      process.exit(1);
    }
    return runCheck(args.input, args.strict);
  }

  if (!args.input || (!args.output && !args.example)) {
    console.error('Missing required arguments: --input and at least one of --output, --example, or --check');
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

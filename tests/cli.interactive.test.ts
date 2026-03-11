import { describe, it, expect } from 'bun:test';
import { spawnSync } from 'bun';
import { readFileSync, unlinkSync } from 'node:fs';

describe('Interactive CLI', () => {
  const CLI_CMD = 'bun ./src/cli.ts';

  it('should create basic schema file', () => {
    const result = spawnSync({
      cmd: [CLI_CMD, '--interactive'],
      stdin: new Blob([
        'y\n', // Add variable
        'TEST_VAR\n', // Name
        '1\n', // Type: string
        '\n', // No description
        'y\n', // Required
        'n\n', // Don't add more
        '\n', // Default filename
        'n\n', // No JSON
        'n\n' // No .env.example
      ])
    });

    expect(result.exitCode).toBe(0);
    const schemaContent = readFileSync('env.schema.ts', 'utf-8');
    expect(schemaContent).toContain('TEST_VAR');
    expect(schemaContent).toContain('type: \'string\'');
    
    // Cleanup
    unlinkSync('env.schema.ts');
  });

  it('should generate enum schema with choices', () => {
    const result = spawnSync({
      cmd: [CLI_CMD, '-c'],
      stdin: new Blob([
        'y\n', // Add variable
        'NODE_ENV\n', // Name
        '4\n', // Type: enum
        'Environment description\n', // Description
        'y\n', // Required
        'development,production\n', // Choices
        'n\n', // Don't add more
        'test.schema.ts\n', // Filename
        'n\n', // No JSON
        'n\n' // No .env.example
      ])
    });

    expect(result.exitCode).toBe(0);
    const schemaContent = readFileSync('test.schema.ts', 'utf-8');
    expect(schemaContent).toContain('choices: [\'development\', \'production\']');
    
    // Cleanup
    unlinkSync('test.schema.ts');
  });

  it('should generate full workflow with JSON and example', () => {
    const result = spawnSync({
      cmd: [CLI_CMD],
      stdin: new Blob([
        'y\n', // Add variable
        'PORT\n', // Name
        '7\n', // Type: port
        'Application port\n', // Description
        'n\n', // Not required
        '3000\n', // Default
        'n\n', // Don't add more
        'test.port.ts\n', // Filename
        'y\n', // Generate JSON
        'test.port.json\n', // JSON filename
        'y\n', // Generate .env.example
        'test.port.env\n' // Example filename
      ])
    });

    expect(result.exitCode).toBe(0);
    expect(readFileSync('test.port.ts', 'utf-8')).toContain('PORT');
    expect(readFileSync('test.port.json', 'utf-8')).toContain('Application port');
    expect(readFileSync('test.port.env', 'utf-8')).toContain('PORT=3000');

    // Cleanup
    ['test.port.ts', 'test.port.json', 'test.port.env'].forEach(f => unlinkSync(f));
  });
});

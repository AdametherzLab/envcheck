import { createSchema } from '../../src/index';

export const schema = createSchema({
  PORT: { type: 'port', default: 3000 },
  NODE_ENV: { type: 'enum', choices: ['development', 'production'] as const },
  API_KEY: { type: 'string', required: true, minLength: 32 }
});

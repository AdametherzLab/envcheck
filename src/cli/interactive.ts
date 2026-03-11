import { prompt } from 'bun';
import { createSchema } from '../index';
import { writeFileSync } from 'node:fs';

type FieldType = 'string' | 'number' | 'boolean' | 'enum' | 'url' | 'email' | 'port';

interface InteractiveField {
  name: string;
  type: FieldType;
  description?: string;
  required: boolean;
  default?: string;
  min?: number;
  max?: number;
  choices?: string[];
  protocols?: string[];
}

const typeQuestions: Record<FieldType, Array<{ message: string; key: keyof InteractiveField; type: 'number' | 'string' | 'list' }>> = {
  string: [
    { message: 'Minimum length (press enter to skip):', key: 'min', type: 'number' },
    { message: 'Maximum length (press enter to skip):', key: 'max', type: 'number' }
  ],
  number: [
    { message: 'Is this an integer? (y/n):', key: 'integer', type: 'string' },
    { message: 'Minimum value (press enter to skip):', key: 'min', type: 'number' },
    { message: 'Maximum value (press enter to skip):', key: 'max', type: 'number' }
  ],
  boolean: [],
  enum: [
    { message: 'Enter possible values (comma-separated):', key: 'choices', type: 'list' }
  ],
  url: [
    { message: 'Allowed protocols (comma-separated, press enter for any):', key: 'protocols', type: 'list' }
  ],
  email: [],
  port: []
};

async function collectField(): Promise<InteractiveField | null> {
  const name = await prompt('Enter environment variable name (e.g., API_KEY):');
  if (!name || name.trim() === '') return null;

  const type = await prompt(`Select type for ${name}:
1) String
2) Number
3) Boolean
4) Enum
5) URL
6) Email
7) Port
Enter choice (1-7):`);
  
  const typeMap: Record<string, FieldType> = {
    '1': 'string',
    '2': 'number',
    '3': 'boolean',
    '4': 'enum',
    '5': 'url',
    '6': 'email',
    '7': 'port'
  };

  const selectedType = typeMap[type?.trim() || ''];
  if (!selectedType) {
    console.log('Invalid type selection');
    return null;
  }

  const field: InteractiveField = {
    name: name.trim(),
    type: selectedType,
    required: true
  };

  // Collect description
  const description = await prompt('Enter description (optional):');
  if (description?.trim()) field.description = description.trim();

  // Collect required
  const required = await prompt('Is this variable required? (y/n, default y):');
  field.required = !required?.trim() || required.trim().toLowerCase() === 'y';

  // Collect default value if not required
  if (!field.required) {
    const defaultValue = await prompt('Enter default value (optional):');
    if (defaultValue?.trim()) field.default = defaultValue.trim();
  }

  // Collect type-specific properties
  for (const question of typeQuestions[selectedType]) {
    const answer = await prompt(question.message);
    if (answer?.trim()) {
      switch (question.type) {
        case 'number':
          field[question.key] = Number(answer.trim());
          break;
        case 'list':
          field[question.key] = answer.split(',').map(item => item.trim());
          break;
        default:
          field[question.key] = answer.trim().toLowerCase() === 'y';
          break;
      }
    }
  }

  return field;
}

export async function runInteractive() {
  console.log('🛠️  Welcome to envcheck interactive schema builder!\n');
  console.log('This guide will help you create an environment variable schema.');
  console.log('Press Ctrl+C at any time to exit.\n');

  const fields: InteractiveField[] = [];

  while (true) {
    console.log(`Current variables: ${fields.map(f => f.name).join(', ') || 'None'}`);
    const addMore = await prompt('\nAdd a new environment variable? (y/n):');
    if (!addMore || addMore.trim().toLowerCase() !== 'y') break;

    const field = await collectField();
    if (field) fields.push(field);
  }

  if (fields.length === 0) {
    console.log('\nNo variables added. Exiting.');
    return;
  }

  // Generate schema object
  const schemaObj = fields.reduce((acc, field) => {
    const config: Record<string, any> = { type: field.type };
    if (field.description) config.description = field.description;
    if (!field.required) config.required = false;
    if (field.default !== undefined) config.default = field.default;

    switch (field.type) {
      case 'string':
        if (field.min) config.minLength = field.min;
        if (field.max) config.maxLength = field.max;
        break;
      case 'number':
        if (field.min) config.min = field.min;
        if (field.max) config.max = field.max;
        break;
      case 'enum':
        config.choices = field.choices;
        break;
      case 'url':
        if (field.protocols) config.protocols = field.protocols;
        break;
    }

    acc[field.name] = config;
    return acc;
  }, {} as Record<string, any>);

  // Write schema file
  const filename = await prompt('\nEnter output filename (default: env.schema.ts):') || 'env.schema.ts';
  const fileContent = `import { createSchema } from 'envcheck';

export const schema = createSchema(${JSON.stringify(schemaObj, null, 2)});
`;
  
  writeFileSync(filename, fileContent);
  console.log(`\n✅ Schema file created at ${filename}`);

  // Offer to generate other files
  const genJson = await prompt('Generate JSON Schema? (y/n):');
  if (genJson?.trim().toLowerCase() === 'y') {
    const jsonFile = await prompt('Enter JSON output filename (default: schema.json):') || 'schema.json';
    require('../cli').main(['--input', filename, '--output', jsonFile]);
  }

  const genExample = await prompt('Generate .env.example file? (y/n):');
  if (genExample?.trim().toLowerCase() === 'y') {
    const exampleFile = await prompt('Enter .env.example filename (default: .env.example):') || '.env.example';
    require('../cli').main(['--input', filename, '--example', exampleFile]);
  }

  console.log('\n🚀 All done! Happy coding!');
}

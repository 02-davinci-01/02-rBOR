import { toPascalCase } from '../../utils/naming';

export function schemaTemplate(name: string): string {
  const pascalName = toPascalCase(name);

  return `// ${pascalName} Validation Schemas
// Define your domain entity schemas here using zod.
// These schemas serve as the single source of truth for data shape and validation.

// import { z } from 'zod';

// export const ${pascalName}Schema = z.object({
//   id: z.string(),
//   // TODO: Add domain-specific fields
//   createdAt: z.string().datetime(),
//   updatedAt: z.string().datetime(),
// });

// /** Inferred TypeScript type from the schema */
// export type ${pascalName} = z.infer<typeof ${pascalName}Schema>;

// /** Schema for creating a new ${name} (omit auto-generated fields) */
// export const Create${pascalName}Schema = ${pascalName}Schema.omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// export type Create${pascalName} = z.infer<typeof Create${pascalName}Schema>;

// /** Schema for updating an existing ${name} (all fields optional) */
// export const Update${pascalName}Schema = Create${pascalName}Schema.partial();

// export type Update${pascalName} = z.infer<typeof Update${pascalName}Schema>;

export {};
`;
}

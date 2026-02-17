import { toPascalCase } from '../../utils/naming';

export function endpointsTemplate(name: string): string {
  const upperName = name.replace(/-/g, '_').toUpperCase();
  const pascalName = toPascalCase(name);

  return `// ${pascalName} Endpoints

export const ${upperName}_ENDPOINTS = {
  GET_${upperName}_LIST: '/${name}',
  GET_${upperName}_BY_ID: '/${name}/:id',
  CREATE_${upperName}: '/${name}',
  UPDATE_${upperName}: '/${name}/:id',
  DELETE_${upperName}: '/${name}/:id',
} as const;
`;
}

export function endpointEntryTemplate(key: string, path: string): string {
  return `  ${key}: '${path}',`;
}

import { toPascalCase } from '../../utils/naming';

export function methodsTemplate(name: string): string {
  const pascalName = toPascalCase(name);
  const upperName = name.replace(/-/g, '_').toUpperCase();

  return `// ${pascalName} Logic - Pure async functions (React-independent)
// Each function receives the service as its first parameter for testability

import type { ${pascalName}Service } from '../services/${name}-service';
import { ${upperName}_ENDPOINTS } from '../utils/constant/${name}-endpoints';

/**
 * Fetch all ${name} items
 */
export const get${pascalName}List = async (
  service: ${pascalName}Service
): Promise<unknown[]> => {
  const response = await service.get<unknown[]>(
    ${upperName}_ENDPOINTS.GET_${upperName}_LIST
  );
  return response?.data || [];
};

/**
 * Fetch a single ${name} by ID
 */
export const get${pascalName}ById = async (
  service: ${pascalName}Service,
  id: string
): Promise<unknown> => {
  const response = await service.get<unknown>(
    ${upperName}_ENDPOINTS.GET_${upperName}_BY_ID,
    { id }  // params - will replace :id in endpoint
  );
  return response?.data;
};

/**
 * Create a new ${name}
 */
export const create${pascalName} = async (
  service: ${pascalName}Service,
  data: unknown
): Promise<unknown> => {
  const response = await service.post<unknown>(
    ${upperName}_ENDPOINTS.CREATE_${upperName},
    data
  );
  return response?.data;
};

/**
 * Update an existing ${name}
 */
export const update${pascalName} = async (
  service: ${pascalName}Service,
  id: string,
  data: unknown
): Promise<unknown> => {
  const response = await service.put<unknown>(
    ${upperName}_ENDPOINTS.UPDATE_${upperName},
    data,
    { id }  // params - will replace :id in endpoint
  );
  return response?.data;
};

/**
 * Delete a ${name}
 */
export const delete${pascalName} = async (
  service: ${pascalName}Service,
  id: string
): Promise<unknown> => {
  const response = await service.delete<unknown>(
    ${upperName}_ENDPOINTS.DELETE_${upperName},
    { id }  // params - will replace :id in endpoint
  );
  return response?.data;
};
`;
}

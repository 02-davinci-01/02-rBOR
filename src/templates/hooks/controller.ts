import { toPascalCase, toKebabCase } from '../../utils/naming';

export function controllerHookTemplate(name: string): string {
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);
  const upperName = name.replace(/-/g, '_').toUpperCase();

  return `// use${pascalName} Hook
// This hook creates the service object and wires up all domain methods.
// The component calls this hook to get everything it needs.
//
// NOTE: If you need access to the Redux store (or any other global state),
// access it in THIS hook and pass the values down to your methods.
// Methods should remain pure async functions — they should not import
// from the store directly.

import { ServiceFactory } from '../../../infrastructure/ServiceFactory';
import type { ${pascalName}Service } from '../services/${kebabName}-service';
import {
  get${pascalName}List,
  get${pascalName}ById,
  create${pascalName},
  update${pascalName},
  delete${pascalName},
} from '../methods/${kebabName}-logic';

export const use${pascalName} = () => {
  const service = ServiceFactory.create('${upperName}') as ${pascalName}Service;

  return {
    getList: () => get${pascalName}List(service),
    getById: (id: string) => get${pascalName}ById(service, id),
    create: (data: unknown) => create${pascalName}(service, data),
    update: (id: string, data: unknown) => update${pascalName}(service, id, data),
    remove: (id: string) => delete${pascalName}(service, id),
  };
};
`;
}

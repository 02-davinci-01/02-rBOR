import { toPascalCase } from '../../utils/naming';

export function controllerHookTemplate(name: string): string {
  const pascalName = toPascalCase(name);

  return `// ${pascalName} Controller Hook
// Orchestrates data and actions into a single UI-ready interface.
// Containers call this hook — it composes, it does not decide.

import { use${pascalName}Data } from './use${pascalName}Data';
import { use${pascalName}Action } from './use${pascalName}Action';

export const use${pascalName} = () => {
  const data = use${pascalName}Data();
  const actions = use${pascalName}Action();

  return {
    ...data,
    ...actions,
  };
};
`;
}

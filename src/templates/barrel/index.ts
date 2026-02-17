import { toPascalCase } from '../../utils/naming';

export function barrelTemplate(name: string): string {
  const pascalName = toPascalCase(name);

  return `// ${pascalName} Feature - Public Entry Point
// This file is the ONLY public export for the ${name} domain.
// All external consumers should import from here.

export { ${pascalName} } from './components/${pascalName}';
`;
}

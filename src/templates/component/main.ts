import { toPascalCase } from '../../utils/naming';

export function mainComponentTemplate(name: string): string {
  return `// ${name} UI component\nexport function ${toPascalCase(name)}() {};\n`;
}

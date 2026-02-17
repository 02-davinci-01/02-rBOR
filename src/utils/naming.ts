export function toPascalCase(input: string): string {
  return input
    .split(/[-_\s]+/)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join('');
}

export function toKebabCase(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[-_\s]+/g, '-')
    .toLowerCase();
}

export function toHooks(input: string): string[] {
  const pascal = toPascalCase(input);
  return [`use${pascal}.ts`, `use${pascal}Data.ts`, `use${pascal}Action.ts`];
}

export function toComponentFile(input: string): string {
  return `${toPascalCase(input)}.tsx`;
}

export function toMethodsFile(input: string): string {
  return `${toKebabCase(input)}-logic.ts`;
}

export function toServicesFile(input: string): string {
  return `${toKebabCase(input)}-service.ts`;
}

export function toTypesFile(input: string): string {
  return `${toKebabCase(input)}-types.ts`;
}

export function toUtilsFiles(input: string): { helper: string; constant: string } {
  const kebab = toKebabCase(input);
  return {
    helper: `${kebab}-helpers.ts`,
    constant: `${kebab}-constants.ts`,
  };
}

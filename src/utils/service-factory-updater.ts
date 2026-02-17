import * as fs from 'fs';
import * as path from 'path';
import { toPascalCase } from './naming';
import { getRelativeImportPath } from './file-finder';

export function updateServiceFactory(
  factoryPath: string,
  domainName: string,
  serviceFilePath: string
): void {
  const content = fs.readFileSync(factoryPath, 'utf-8');
  const pascalName = toPascalCase(domainName);
  const upperName = domainName.replace(/-/g, '').toUpperCase();
  const relativePath = getRelativeImportPath(factoryPath, serviceFilePath);

  if (content.includes(`"${upperName}"`)) {
    console.log(`  ⚠️  ${pascalName}Service already in ServiceFactory`);
    return;
  }

  let updated = content;

  const importStatement = `import { ${pascalName}Service } from '${relativePath}';`;
  const lastImportMatch = updated.match(/^import .+ from .+;$/gm);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    updated = updated.replace(lastImport, `${lastImport}\n${importStatement}`);
  }

  const serviceTypeMatch = updated.match(/type ServiceType = ([^;]+);/);
  if (serviceTypeMatch) {
    const currentTypes = serviceTypeMatch[1];
    const newTypes = `${currentTypes} | "${upperName}"`;
    updated = updated.replace(
      `type ServiceType = ${currentTypes};`,
      `type ServiceType = ${newTypes};`
    );
  }

  const overloadSignature = `  /**
   * ${pascalName} Service
   */
  static create(type: "${upperName}"): ${pascalName}Service;

  /**`;
  updated = updated.replace(
    /  \/\*\*\n   \* Implementation/,
    `${overloadSignature}
   * Implementation`
  );

  const switchCase = `      case "${upperName}":
        return new ${pascalName}Service();

      default:`;
  updated = updated.replace(/      default:/, switchCase);

  fs.writeFileSync(factoryPath, updated);
  console.log(`  🏭 Updated ServiceFactory with ${pascalName}Service`);
}

export function findServiceFactory(startDir: string = process.cwd()): string | null {
  const infraPath = path.join(startDir, 'infrastructure', 'ServiceFactory.ts');
  if (fs.existsSync(infraPath)) {
    return infraPath;
  }
  return null;
}

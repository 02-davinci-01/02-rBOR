import * as fs from 'fs';
import * as path from 'path';
import { toPascalCase } from './naming';

/**
 * With the registry-based ServiceFactory, the factory file itself never
 * needs updating when a new domain is created. Each domain service
 * self-registers via `ServiceFactory.register()` at module scope.
 *
 * This function now only verifies that ServiceFactory.ts exists, and logs
 * a message. Kept for backwards compatibility with the generate-domain flow.
 */
export function updateServiceFactory(
  factoryPath: string,
  domainName: string,
  _serviceFilePath: string
): void {
  const pascalName = toPascalCase(domainName);

  if (!fs.existsSync(factoryPath)) {
    console.log(`  ⚠️  ServiceFactory not found at ${factoryPath}`);
    return;
  }

  console.log(
    `  🏭 ${pascalName}Service self-registers with ServiceFactory (no factory update needed)`
  );
}

export function findServiceFactory(startDir: string = process.cwd()): string | null {
  const infraPath = path.join(startDir, 'infrastructure', 'ServiceFactory.ts');
  if (fs.existsSync(infraPath)) {
    return infraPath;
  }
  return null;
}

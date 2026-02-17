import { toPascalCase } from '../../utils/naming';

export function serviceFactoryTemplate(domainName: string, servicePath: string): string {
  const pascalName = toPascalCase(domainName);
  const upperName = domainName.replace(/-/g, '').toUpperCase();

  return `// Domain Service Imports
import { ${pascalName}Service } from '${servicePath}';

// Type Imports
import type { BaseService } from './BaseService';

/**
 * Supported service types - auto-updated when new domains are created
 */
type ServiceType = "${upperName}";

/**
 * ServiceFactory - Creates service instances per domain
 */
export class ServiceFactory {
  /**
   * ${pascalName} Service
   */
  static create(type: "${upperName}"): ${pascalName}Service;

  /**
   * Implementation
   */
  static create(type: ServiceType): BaseService {
    return this.createService(type);
  }

  private static createService(type: ServiceType): BaseService {
    switch (type) {
      case "${upperName}":
        return new ${pascalName}Service();

      default:
        throw new Error(\`Unknown service type: \${type}\`);
    }
  }
}
`;
}

export function getServiceImport(domainName: string, servicePath: string): string {
  const pascalName = toPascalCase(domainName);
  return `import { ${pascalName}Service } from '${servicePath}';`;
}

export function getServiceOverload(domainName: string): string {
  const pascalName = toPascalCase(domainName);
  const upperName = domainName.replace(/-/g, '').toUpperCase();
  return `  /**
   * ${pascalName} Service
   */
  static create(type: "${upperName}"): ${pascalName}Service;`;
}

export function getServiceCase(domainName: string): string {
  const pascalName = toPascalCase(domainName);
  const upperName = domainName.replace(/-/g, '').toUpperCase();
  return `      case "${upperName}":
        return new ${pascalName}Service();`;
}

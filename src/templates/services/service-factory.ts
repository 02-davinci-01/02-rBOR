export function serviceFactoryTemplate(): string {
  return `import type { BaseService } from './BaseService';

/**
 * ServiceFactory — Registry-based factory for domain services.
 *
 * Services register themselves via ServiceFactory.register() at the bottom
 * of their own file. This keeps infrastructure independent — it never imports
 * domain code. The dependency flows downward (service → infrastructure),
 * not upward.
 *
 * Usage in a controller hook:
 *   import '../services/clause-service';   // triggers self-registration
 *   const service = ServiceFactory.create('CLAUSE');
 */
export type ServiceCreator = () => BaseService;

export class ServiceFactory {
  private static registry = new Map<string, ServiceCreator>();

  /**
   * Register a service creator under a domain key.
   * Called once per domain service file (side-effect at module scope).
   */
  static register(type: string, creator: ServiceCreator): void {
    this.registry.set(type, creator);
  }

  /**
   * Create a service instance by domain key.
   */
  static create(type: string): BaseService {
    const creator = this.registry.get(type);
    if (!creator) {
      throw new Error(
        \`Unknown service type: "\${type}". \` +
        \`Make sure the domain service file is imported before calling create().\`
      );
    }
    return creator();
  }
}
`;
}

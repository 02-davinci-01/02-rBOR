export { axiosBaseServiceTemplate } from './base-service-axios';
export { fetchBaseServiceTemplate } from './base-service-fetch';
export { kyBaseServiceTemplate } from './base-service-ky';

export { domainServiceTemplate } from './domain-service';

export {
  serviceFactoryTemplate,
  getServiceImport,
  getServiceOverload,
  getServiceCase,
} from './service-factory';

export { baseServiceTemplate } from './base-service';

export function servicesTemplate(name: string): string {
  return `// ${name} API and external services\nexport {};\n`;
}

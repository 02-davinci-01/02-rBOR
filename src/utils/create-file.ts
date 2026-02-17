import * as fs from 'fs';
import * as path from 'path';
import {
  barrelTemplate,
  controllerHookTemplate,
  dataHookTemplate,
  actionHookTemplate,
  mainComponentTemplate,
  methodsTemplate,
  domainServiceTemplate,
  axiosBaseServiceTemplate,
  fetchBaseServiceTemplate,
  kyBaseServiceTemplate,
  serviceFactoryTemplate,
  typesTemplate,
  utilsTemplate,
  schemaTemplate,
  generateUrlTemplate,
  endpointsTemplate,
} from '../templates';
import {
  toHooks,
  toComponentFile,
  toMethodsFile,
  toServicesFile,
  toTypesFile,
  toUtilsFiles,
} from './naming';
import { findBaseService, getRelativeImportPath } from './file-finder';
import { ensureDependency } from './dependency-installer';
import { findServiceFactory, updateServiceFactory } from './service-factory-updater';
import type { HttpClient } from '../cli';

const HTTP_CLIENT_CONFIG: Record<
  HttpClient,
  {
    template: () => string;
    dependency: string | null;
  }
> = {
  axios: {
    template: axiosBaseServiceTemplate,
    dependency: 'axios',
  },
  fetch: {
    template: fetchBaseServiceTemplate,
    dependency: null,
  },
  ky: {
    template: kyBaseServiceTemplate,
    dependency: 'ky',
  },
};

export function createBarrel(input: string, targetDir: string): void {
  fs.writeFileSync(path.join(targetDir, 'index.tsx'), barrelTemplate(input));
  console.log(`  📋 Created index.tsx (barrel entry point)`);
}

export function createHooks(input: string, targetDir: string): void {
  const hookFiles = toHooks(input);
  fs.writeFileSync(path.join(targetDir, 'hooks', hookFiles[0]), controllerHookTemplate(input));
  fs.writeFileSync(path.join(targetDir, 'hooks', hookFiles[1]), dataHookTemplate(input));
  fs.writeFileSync(path.join(targetDir, 'hooks', hookFiles[2]), actionHookTemplate(input));
}

export function createComponent(input: string, targetDir: string): void {
  fs.writeFileSync(
    path.join(targetDir, 'components', toComponentFile(input)),
    mainComponentTemplate(input)
  );
}

export function createMethods(input: string, targetDir: string): void {
  fs.writeFileSync(path.join(targetDir, 'methods', toMethodsFile(input)), methodsTemplate(input));
}

export function ensureInfrastructure(httpClient: HttpClient): string {
  const baseService = findBaseService();

  if (baseService.exists && baseService.path) {
    console.log(`  ✅ BaseService found at: ${baseService.path}`);
    return baseService.path;
  }

  const config = HTTP_CLIENT_CONFIG[httpClient];

  if (config.dependency) {
    ensureDependency(config.dependency);
  } else {
    console.log(`  ✅ Using native fetch (no dependency needed)`);
  }

  const infraDir = path.join(process.cwd(), 'infrastructure');
  const baseServicePath = path.join(infraDir, 'BaseService.ts');

  fs.mkdirSync(infraDir, { recursive: true });
  fs.writeFileSync(baseServicePath, config.template());

  console.log(`  🏗️  Created infrastructure/BaseService.ts (${httpClient})`);
  return baseServicePath;
}

export function ensureServiceFactory(input: string, serviceFilePath: string): void {
  const factoryPath = findServiceFactory();

  if (factoryPath) {
    updateServiceFactory(factoryPath, input, serviceFilePath);
  } else {
    const infraDir = path.join(process.cwd(), 'infrastructure');
    const newFactoryPath = path.join(infraDir, 'ServiceFactory.ts');
    const relativePath = getRelativeImportPath(newFactoryPath, serviceFilePath);

    fs.writeFileSync(newFactoryPath, serviceFactoryTemplate(input, relativePath));
    console.log(`  🏭 Created infrastructure/ServiceFactory.ts`);
  }
}

export function createServices(input: string, targetDir: string, httpClient: HttpClient): void {
  ensureInfrastructure(httpClient);

  const serviceFilePath = path.join(targetDir, 'services', toServicesFile(input));

  fs.writeFileSync(serviceFilePath, domainServiceTemplate(input, httpClient));
  console.log(`  📦 Created ${toServicesFile(input)}`);

  ensureServiceFactory(input, serviceFilePath);
}

export function createTypes(input: string, targetDir: string): void {
  fs.writeFileSync(path.join(targetDir, 'types', toTypesFile(input)), typesTemplate(input));
}

export function createUtils(input: string, targetDir: string): void {
  const utilFiles = toUtilsFiles(input);
  fs.mkdirSync(path.join(targetDir, 'utils', 'helper'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'utils', 'constant'), { recursive: true });
  fs.writeFileSync(
    path.join(targetDir, 'utils', 'helper', utilFiles.helper),
    utilsTemplate(input + ' helpers')
  );
  fs.writeFileSync(
    path.join(targetDir, 'utils', 'constant', utilFiles.constant),
    utilsTemplate(input + ' constants')
  );
}

export function ensureGenerateUrl(): void {
  const infraDir = path.join(process.cwd(), 'infrastructure');
  const generateUrlPath = path.join(infraDir, 'generateURL.ts');

  if (fs.existsSync(generateUrlPath)) {
    return;
  }

  fs.mkdirSync(infraDir, { recursive: true });
  fs.writeFileSync(generateUrlPath, generateUrlTemplate());
  console.log(`  🔗 Created infrastructure/generateURL.ts`);
}

export function createEndpoints(input: string, targetDir: string): void {
  const endpointsPath = path.join(targetDir, 'utils', 'constant', `${input}-endpoints.ts`);
  fs.writeFileSync(endpointsPath, endpointsTemplate(input));
  console.log(`  📍 Created ${input}-endpoints.ts`);
}

export function createSchema(input: string, targetDir: string): void {
  const kebab = input
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[-_\s]+/g, '-')
    .toLowerCase();
  const schemaPath = path.join(targetDir, 'schema', `${kebab}-schema.ts`);
  fs.writeFileSync(schemaPath, schemaTemplate(input));
  console.log(`  📋 Created ${kebab}-schema.ts`);
}

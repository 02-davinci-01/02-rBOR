import * as fs from 'fs';
import * as path from 'path';

import {
  createBarrel,
  createHooks,
  createComponent,
  createMethods,
  createServices,
  createTypes,
  createUtils,
  createSchema,
  ensureGenerateUrl,
  createEndpoints,
} from '../utils/create-file';
import type { DomainOptions } from '../cli';
import { loadConfig, getDomainsPath } from '../utils/config';

function ensureDomainsFolder(domainsPath: string): string {
  if (!fs.existsSync(domainsPath)) {
    fs.mkdirSync(domainsPath, { recursive: true });
    console.log(`  📁 Created ${domainsPath} folder`);
  }

  return domainsPath;
}

export const generateDomain = (domainName: string, options: DomainOptions): void => {
  const config = loadConfig();
  const httpClient = options.http || config.http;

  console.log(`🚀 Generating domain: ${domainName}`);
  console.log(`  📡 HTTP client: ${httpClient}`);

  const domainsPath = getDomainsPath(config);
  ensureDomainsFolder(domainsPath);

  const targetDir = path.join(domainsPath, domainName);

  if (fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory "${config.domainsPath}/${domainName}" already exists!`);
    process.exit(1);
  }

  const folders = [
    '__test__',
    'components',
    'hooks',
    'methods',
    'schema',
    'services',
    'types',
    'utils',
  ];

  folders.forEach(folder => {
    const folderPath = path.join(targetDir, folder);
    fs.mkdirSync(folderPath, { recursive: true });
  });

  ensureGenerateUrl();

  createBarrel(domainName, targetDir);

  createComponent(domainName, targetDir);
  createHooks(domainName, targetDir);
  createMethods(domainName, targetDir);
  createServices(domainName, targetDir, httpClient);
  createTypes(domainName, targetDir);
  createUtils(domainName, targetDir);
  createEndpoints(domainName, targetDir);
  createSchema(domainName, targetDir);

  console.log(`✅ Successfully created domain: ${config.domainsPath}/${domainName}`);
};

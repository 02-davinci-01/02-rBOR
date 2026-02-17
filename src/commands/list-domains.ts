import * as fs from 'fs';
import * as path from 'path';
import { getDomainsPath, loadConfig } from '../utils/config';

interface DomainInfo {
  name: string;
  folders: string[];
  fileCount: number;
  hasService: boolean;
  hasSchema: boolean;
  endpointCount: number;
}

function countFiles(dir: string): number {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        count++;
      } else if (entry.isDirectory()) {
        count += countFiles(path.join(dir, entry.name));
      }
    }
  } catch {}
  return count;
}

function countEndpoints(domainPath: string, domainName: string): number {
  const endpointsPath = path.join(domainPath, 'utils', 'constant', `${domainName}-endpoints.ts`);
  if (!fs.existsSync(endpointsPath)) return 0;

  try {
    const content = fs.readFileSync(endpointsPath, 'utf-8');
    const matches = content.match(/^\s+\w+:\s*'/gm);
    return matches?.length ?? 0;
  } catch {
    return 0;
  }
}

function getDomainInfo(domainPath: string, domainName: string): DomainInfo {
  const folders: string[] = [];

  try {
    const entries = fs.readdirSync(domainPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        folders.push(entry.name);
      }
    }
  } catch {}

  const servicesDir = path.join(domainPath, 'services');
  const schemaDir = path.join(domainPath, 'schema');

  return {
    name: domainName,
    folders,
    fileCount: countFiles(domainPath),
    hasService: fs.existsSync(servicesDir) && fs.readdirSync(servicesDir).length > 0,
    hasSchema: fs.existsSync(schemaDir) && fs.readdirSync(schemaDir).some(f => f !== '.gitkeep'),
    endpointCount: countEndpoints(domainPath, domainName),
  };
}

export function listDomains(): void {
  const config = loadConfig();
  const domainsPath = getDomainsPath(config);

  console.log('📦 rBOR Domains');
  console.log(`   Path: ${config.domainsPath}/`);
  console.log('');

  if (!fs.existsSync(domainsPath)) {
    console.log(
      '   No domains folder found. Run `rbor domain <name>` to create your first domain.'
    );
    return;
  }

  const entries = fs.readdirSync(domainsPath, { withFileTypes: true });
  const domains = entries
    .filter(e => e.isDirectory())
    .map(e => getDomainInfo(path.join(domainsPath, e.name), e.name));

  if (domains.length === 0) {
    console.log('   No domains found. Run `rbor domain <name>` to create your first domain.');
    return;
  }

  // Display table-like output
  console.log('───────────────────────────────────────────────────────────');

  for (const domain of domains) {
    const service = domain.hasService ? '✅' : '❌';
    const schema = domain.hasSchema ? '✅' : '❌';

    console.log(`   📁 ${domain.name}`);
    console.log(
      `      Files: ${domain.fileCount}  |  Endpoints: ${domain.endpointCount}  |  Service: ${service}  |  Schema: ${schema}`
    );
    console.log(`      Folders: ${domain.folders.join(', ')}`);
    console.log('');
  }

  console.log('───────────────────────────────────────────────────────────');
  console.log(`   Total: ${domains.length} domain(s)`);
}

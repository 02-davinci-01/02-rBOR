import * as fs from 'fs';
import * as path from 'path';

const DOMAINS_FOLDER = 'domains';

interface DomainContext {
  isValid: boolean;
  domainName: string | null;
  domainPath: string | null;
  endpointsFile: string | null;
  error?: string;
}

function detectDomainContext(): DomainContext {
  const cwd = process.cwd();
  const domainsPath = path.join(cwd, '..', '..').includes(DOMAINS_FOLDER)
    ? path.resolve(cwd, '..', '..')
    : null;

  const parentDir = path.basename(path.dirname(cwd));
  const currentDir = path.basename(cwd);

  if (parentDir === DOMAINS_FOLDER) {
    const domainName = currentDir;
    const domainPath = cwd;
    const endpointsFile = path.join(domainPath, 'utils', 'constant', `${domainName}-endpoints.ts`);

    if (!fs.existsSync(endpointsFile)) {
      return {
        isValid: false,
        domainName,
        domainPath,
        endpointsFile: null,
        error: `Endpoints file not found. Run 'rbor domain ${domainName}' first.`,
      };
    }

    return { isValid: true, domainName, domainPath, endpointsFile };
  }

  const pathParts = cwd.split(path.sep);
  const domainsIndex = pathParts.indexOf(DOMAINS_FOLDER);

  if (domainsIndex !== -1 && pathParts.length > domainsIndex + 1) {
    const domainName = pathParts[domainsIndex + 1];
    const domainPath = pathParts.slice(0, domainsIndex + 2).join(path.sep);
    const endpointsFile = path.join(domainPath, 'utils', 'constant', `${domainName}-endpoints.ts`);

    if (!fs.existsSync(endpointsFile)) {
      return {
        isValid: false,
        domainName,
        domainPath,
        endpointsFile: null,
        error: `Endpoints file not found. Run 'rbor domain ${domainName}' first.`,
      };
    }

    return { isValid: true, domainName, domainPath, endpointsFile };
  }

  return {
    isValid: false,
    domainName: null,
    domainPath: null,
    endpointsFile: null,
    error: `Not inside a domain folder. Navigate to domains/<domain>/ and try again.`,
  };
}

function toEndpointKey(endpointPath: string): string {
  return endpointPath
    .replace(/^\//, '')
    .replace(/:/g, '')
    .replace(/[\/\-]/g, '_')
    .toUpperCase();
}

function addEndpoint(endpointsFile: string, domainName: string, endpointPath: string): void {
  const content = fs.readFileSync(endpointsFile, 'utf-8');
  const upperName = domainName.replace(/-/g, '_').toUpperCase();
  const endpointKey = toEndpointKey(endpointPath);

  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;

  if (content.includes(`${endpointKey}:`)) {
    console.log(`⚠️  Endpoint '${endpointKey}' already exists in ${upperName}_ENDPOINTS`);
    return;
  }

  const objectPattern = new RegExp(
    `(export const ${upperName}_ENDPOINTS = {[\\s\\S]*?)(} as const;)`
  );
  const match = content.match(objectPattern);

  if (!match) {
    console.error(`❌ Could not find ${upperName}_ENDPOINTS object in file`);
    process.exit(1);
  }

  const newEntry = `  ${endpointKey}: '${normalizedPath}',\n`;
  const updatedContent = content.replace(objectPattern, `$1${newEntry}$2`);

  fs.writeFileSync(endpointsFile, updatedContent);
  console.log(`✅ Added endpoint: ${endpointKey}: '${normalizedPath}'`);
}

export const generateEndpoint = (endpointPath: string): void => {
  const context = detectDomainContext();

  if (!context.isValid) {
    console.error(`❌ ${context.error}`);
    process.exit(1);
  }

  console.log(`📍 Adding endpoint to ${context.domainName}`);
  addEndpoint(context.endpointsFile!, context.domainName!, endpointPath);
};

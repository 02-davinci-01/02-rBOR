import * as fs from 'fs';
import * as path from 'path';

const DOMAINS_FOLDER = 'domains';

interface DomainContext {
  isValid: boolean;
  domainName: string | null;
  domainPath: string | null;
  constantsFile: string | null;
  error?: string;
}

function detectDomainContext(): DomainContext {
  const cwd = process.cwd();

  const parentDir = path.basename(path.dirname(cwd));
  const currentDir = path.basename(cwd);

  if (parentDir === DOMAINS_FOLDER) {
    const domainName = currentDir;
    const domainPath = cwd;
    const constantsFile = path.join(domainPath, 'utils', 'constant', `${domainName}-constants.ts`);

    if (!fs.existsSync(constantsFile)) {
      return {
        isValid: false,
        domainName,
        domainPath,
        constantsFile: null,
        error: `Constants file not found. Run 'rbor domain ${domainName}' first.`,
      };
    }

    return { isValid: true, domainName, domainPath, constantsFile };
  }

  const pathParts = cwd.split(path.sep);
  const domainsIndex = pathParts.indexOf(DOMAINS_FOLDER);

  if (domainsIndex !== -1 && pathParts.length > domainsIndex + 1) {
    const domainName = pathParts[domainsIndex + 1];
    const domainPath = pathParts.slice(0, domainsIndex + 2).join(path.sep);
    const constantsFile = path.join(domainPath, 'utils', 'constant', `${domainName}-constants.ts`);

    if (!fs.existsSync(constantsFile)) {
      return {
        isValid: false,
        domainName,
        domainPath,
        constantsFile: null,
        error: `Constants file not found. Run 'rbor domain ${domainName}' first.`,
      };
    }

    return { isValid: true, domainName, domainPath, constantsFile };
  }

  return {
    isValid: false,
    domainName: null,
    domainPath: null,
    constantsFile: null,
    error: `Not inside a domain folder. Navigate to domains/<domain>/ and try again.`,
  };
}

function toConstantKey(input: string): string {
  return input
    .replace(/[\/\-\s]+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

function parseConstantInput(input: string): { key: string; value: string } {
  const eqIndex = input.indexOf('=');
  if (eqIndex === -1) {
    console.error(`❌ Invalid format. Use: rbor constant <key>=<value>`);
    console.error(`   Example: rbor constant time=2000`);
    process.exit(1);
  }

  const rawKey = input.substring(0, eqIndex).trim();
  const rawValue = input.substring(eqIndex + 1).trim();

  if (!rawKey || !rawValue) {
    console.error(`❌ Both key and value are required. Use: rbor constant <key>=<value>`);
    process.exit(1);
  }

  return { key: toConstantKey(rawKey), value: rawValue };
}

function inferType(value: string): string {
  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  // Boolean
  if (value === 'true' || value === 'false') return value;
  // String (wrap in quotes if not already)
  if (value.startsWith("'") || value.startsWith('"')) return value;
  return `'${value}'`;
}

function addConstant(constantsFile: string, key: string, value: string): void {
  let content = fs.readFileSync(constantsFile, 'utf-8');
  const typedValue = inferType(value);

  if (content.includes(`${key}`)) {
    console.log(`⚠️  Constant '${key}' already exists in the constants file`);
    return;
  }

  // If the file is just a bare `export {};`, replace it with the first constant
  if (/export\s*\{\s*\}\s*;?\s*$/.test(content.trim())) {
    const newContent = content.replace(
      /export\s*\{\s*\}\s*;?\s*$/,
      `export const ${key} = ${typedValue};\n`
    );
    fs.writeFileSync(constantsFile, newContent);
    console.log(`✅ Added constant: ${key} = ${typedValue}`);
    return;
  }

  // Otherwise, append at the end of the file
  const newEntry = `export const ${key} = ${typedValue};\n`;
  content = content.trimEnd() + '\n' + newEntry;
  fs.writeFileSync(constantsFile, content);
  console.log(`✅ Added constant: ${key} = ${typedValue}`);
}

export const generateConstant = (input: string): void => {
  const context = detectDomainContext();

  if (!context.isValid) {
    console.error(`❌ ${context.error}`);
    process.exit(1);
  }

  const { key, value } = parseConstantInput(input);

  console.log(`📌 Adding constant to ${context.domainName}`);
  addConstant(context.constantsFile!, key, value);
};

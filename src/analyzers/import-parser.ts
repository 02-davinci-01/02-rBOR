import * as fs from 'fs';
import * as path from 'path';
import type {
  ParsedImport,
  FileParseResult,
  ImportType,
  ImportKind,
} from '../types/dependency-graph';

const IMPORT_PATTERNS = {
  // import defaultExport from 'module'
  // import { named } from 'module'
  // import * as namespace from 'module'
  // import type { Type } from 'module'
  staticImport:
    /^import\s+(?:type\s+)?(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]*)\})?(?:\s*,?\s*\*\s+as\s+(\w+))?\s+from\s+['"]([^'"]+)['"]/gm,

  // import 'module' (side-effect)
  sideEffectImport: /^import\s+['"]([^'"]+)['"]/gm,

  // export { named } from 'module'
  // export * from 'module'
  reexport: /^export\s+(?:\{([^}]*)\}|\*(?:\s+as\s+(\w+))?)\s+from\s+['"]([^'"]+)['"]/gm,

  // const x = require('module')
  // require('module')
  require:
    /(?:const|let|var)\s+(?:\{([^}]*)\}|(\w+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,

  // import('module')
  // next/dynamic(() => import('module'))
  dynamicImport:
    /(?:import|dynamic)\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,

  // Type-only import detection
  typeOnly: /^import\s+type\s+/,
};

function parseStaticImport(match: RegExpExecArray, lineNumber: number): ParsedImport {
  const [raw, defaultImport, namedImportsStr, namespaceImport, source] = match;

  const specifiers: string[] = [];

  if (namedImportsStr) {
    const namedParts = namedImportsStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    for (const part of namedParts) {
      const [original] = part.split(/\s+as\s+/);
      if (original) {
        specifiers.push(original.trim());
      }
    }
  }

  let importKind: ImportKind = 'named';
  if (defaultImport && !namedImportsStr && !namespaceImport) {
    importKind = 'default';
  } else if (namespaceImport) {
    importKind = 'namespace';
  }

  if (IMPORT_PATTERNS.typeOnly.test(raw)) {
    importKind = 'type-only';
  }

  return {
    source,
    importType: 'static',
    importKind,
    specifiers,
    defaultImport: defaultImport || undefined,
    namespaceImport: namespaceImport || undefined,
    line: lineNumber,
    raw: raw.trim(),
  };
}

function getLineNumber(content: string, position: number): number {
  const lines = content.substring(0, position).split('\n');
  return lines.length;
}

export function parseImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];

  IMPORT_PATTERNS.staticImport.lastIndex = 0;
  IMPORT_PATTERNS.sideEffectImport.lastIndex = 0;
  IMPORT_PATTERNS.require.lastIndex = 0;
  IMPORT_PATTERNS.dynamicImport.lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = IMPORT_PATTERNS.staticImport.exec(content)) !== null) {
    const lineNumber = getLineNumber(content, match.index);
    imports.push(parseStaticImport(match, lineNumber));
  }

  IMPORT_PATTERNS.sideEffectImport.lastIndex = 0;
  while ((match = IMPORT_PATTERNS.sideEffectImport.exec(content)) !== null) {
    const source = match[1];
    if (imports.some(i => i.source === source && i.line === getLineNumber(content, match!.index))) {
      continue;
    }

    imports.push({
      source,
      importType: 'side-effect',
      importKind: 'side-effect',
      specifiers: [],
      line: getLineNumber(content, match.index),
      raw: match[0].trim(),
    });
  }

  IMPORT_PATTERNS.require.lastIndex = 0;
  while ((match = IMPORT_PATTERNS.require.exec(content)) !== null) {
    const [raw, namedDestructure, defaultName, source1, source2] = match;
    const source = source1 || source2;

    const specifiers: string[] = [];
    if (namedDestructure) {
      specifiers.push(
        ...namedDestructure
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      );
    }

    imports.push({
      source,
      importType: 'require',
      importKind: namedDestructure ? 'named' : defaultName ? 'default' : 'side-effect',
      specifiers,
      defaultImport: defaultName || undefined,
      line: getLineNumber(content, match.index),
      raw: raw.trim(),
    });
  }

  IMPORT_PATTERNS.dynamicImport.lastIndex = 0;
  while ((match = IMPORT_PATTERNS.dynamicImport.exec(content)) !== null) {
    const source = match[1] || match[2];
    if (!source) continue;

    imports.push({
      source,
      importType: 'dynamic',
      importKind: 'default',
      specifiers: [],
      line: getLineNumber(content, match.index),
      raw: match[0].trim(),
    });
  }

  return imports;
}

export function parseExports(content: string): ParsedImport[] {
  const exports: ParsedImport[] = [];

  IMPORT_PATTERNS.reexport.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = IMPORT_PATTERNS.reexport.exec(content)) !== null) {
    const [raw, namedExportsStr, namespaceAlias, source] = match;

    const specifiers: string[] = [];
    if (namedExportsStr) {
      specifiers.push(
        ...namedExportsStr
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      );
    }

    exports.push({
      source,
      importType: 'reexport',
      importKind: namespaceAlias ? 'namespace' : namedExportsStr ? 'named' : 'namespace',
      specifiers,
      namespaceImport: namespaceAlias || undefined,
      line: getLineNumber(content, match.index),
      raw: raw.trim(),
    });
  }

  return exports;
}

export function parseFile(filePath: string): FileParseResult {
  const result: FileParseResult = {
    filePath: path.resolve(filePath),
    imports: [],
    exports: [],
    errors: [],
  };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    result.imports = parseImports(content);
    result.exports = parseExports(content);
  } catch (error) {
    result.errors.push(
      `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}

export function isRelativeImport(importPath: string): boolean {
  return importPath.startsWith('./') || importPath.startsWith('../');
}

export function isAliasImport(importPath: string, aliases: Record<string, string>): boolean {
  return Object.keys(aliases).some(alias => importPath.startsWith(alias));
}

export function isBuiltinModule(importPath: string): boolean {
  const builtins = [
    'fs',
    'path',
    'os',
    'util',
    'events',
    'stream',
    'http',
    'https',
    'crypto',
    'buffer',
    'url',
    'querystring',
    'child_process',
    'cluster',
    'dgram',
    'dns',
    'net',
    'readline',
    'repl',
    'tls',
    'tty',
    'v8',
    'vm',
    'zlib',
    'assert',
    'async_hooks',
    'console',
    'constants',
    'domain',
    'inspector',
    'module',
    'perf_hooks',
    'process',
    'punycode',
    'string_decoder',
    'sys',
    'timers',
    'trace_events',
    'worker_threads',
    'node:fs',
    'node:path',
    'node:os',
    'node:util',
    'node:events',
    'node:stream',
    'node:http',
    'node:https',
    'node:crypto',
    'node:buffer',
  ];

  const normalizedPath = importPath.replace(/^node:/, '');
  return builtins.includes(importPath) || builtins.includes(normalizedPath);
}

export function extractPackageName(importPath: string): string {
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return importPath;
  }

  const firstSlash = importPath.indexOf('/');
  if (firstSlash > 0) {
    return importPath.substring(0, firstSlash);
  }

  return importPath;
}

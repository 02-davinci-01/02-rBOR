import { describe, it, expect } from 'vitest';
import {
  parseImports,
  parseExports,
  isRelativeImport,
  isBuiltinModule,
  extractPackageName,
} from './import-parser';

describe('import-parser', () => {
  describe('parseImports', () => {
    it('parses default imports', () => {
      const content = `import React from 'react';`;
      const imports = parseImports(content);

      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        source: 'react',
        importType: 'static',
        importKind: 'default',
        defaultImport: 'React',
        specifiers: [],
      });
    });

    it('parses named imports', () => {
      const content = `import { useState, useEffect } from 'react';`;
      const imports = parseImports(content);

      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        source: 'react',
        importType: 'static',
        importKind: 'named',
        specifiers: ['useState', 'useEffect'],
      });
    });

    it('parses namespace imports', () => {
      const content = `import * as fs from 'fs';`;
      const imports = parseImports(content);

      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        source: 'fs',
        importType: 'static',
        importKind: 'namespace',
        namespaceImport: 'fs',
      });
    });

    it('parses type-only imports', () => {
      const content = `import type { User } from './types';`;
      const imports = parseImports(content);

      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        source: './types',
        importKind: 'type-only',
      });
    });

    it('parses side-effect imports', () => {
      const content = `import './styles.css';`;
      const imports = parseImports(content);

      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        source: './styles.css',
        importType: 'side-effect',
        importKind: 'side-effect',
      });
    });

    it('parses require statements', () => {
      const content = `const fs = require('fs');`;
      const imports = parseImports(content);

      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        source: 'fs',
        importType: 'require',
        importKind: 'default',
        defaultImport: 'fs',
      });
    });

    it('parses dynamic imports', () => {
      const content = `const mod = import('./module');`;
      const imports = parseImports(content);

      expect(imports).toHaveLength(1);
      expect(imports[0]).toMatchObject({
        source: './module',
        importType: 'dynamic',
      });
    });

    it('parses multiple imports', () => {
      const content = `
import React from 'react';
import { useState } from 'react';
import * as path from 'path';
      `.trim();

      const imports = parseImports(content);
      expect(imports).toHaveLength(3);
      expect(imports.map(i => i.source)).toEqual(['react', 'react', 'path']);
    });

    it('handles imports with aliases', () => {
      const content = `import { foo as bar } from './module';`;
      const imports = parseImports(content);

      expect(imports).toHaveLength(1);
      expect(imports[0].specifiers).toEqual(['foo']);
    });
  });

  describe('parseExports', () => {
    it('parses named re-exports', () => {
      const content = `export { foo, bar } from './module';`;
      const exports = parseExports(content);

      expect(exports).toHaveLength(1);
      expect(exports[0]).toMatchObject({
        source: './module',
        importType: 'reexport',
        importKind: 'named',
        specifiers: ['foo', 'bar'],
      });
    });

    it('parses namespace re-exports', () => {
      const content = `export * from './module';`;
      const exports = parseExports(content);

      expect(exports).toHaveLength(1);
      expect(exports[0]).toMatchObject({
        source: './module',
        importType: 'reexport',
        importKind: 'namespace',
      });
    });

    it('parses namespace re-exports with alias', () => {
      const content = `export * as utils from './utils';`;
      const exports = parseExports(content);

      expect(exports).toHaveLength(1);
      expect(exports[0]).toMatchObject({
        source: './utils',
        importType: 'reexport',
        importKind: 'namespace',
        namespaceImport: 'utils',
      });
    });
  });

  describe('isRelativeImport', () => {
    it('identifies relative imports', () => {
      expect(isRelativeImport('./module')).toBe(true);
      expect(isRelativeImport('../module')).toBe(true);
      expect(isRelativeImport('./utils/helper')).toBe(true);
    });

    it('rejects non-relative imports', () => {
      expect(isRelativeImport('react')).toBe(false);
      expect(isRelativeImport('@/utils')).toBe(false);
      expect(isRelativeImport('lodash')).toBe(false);
    });
  });

  describe('isBuiltinModule', () => {
    it('identifies Node.js builtin modules', () => {
      expect(isBuiltinModule('fs')).toBe(true);
      expect(isBuiltinModule('path')).toBe(true);
      expect(isBuiltinModule('http')).toBe(true);
      expect(isBuiltinModule('node:fs')).toBe(true);
      expect(isBuiltinModule('node:path')).toBe(true);
    });

    it('rejects non-builtin modules', () => {
      expect(isBuiltinModule('react')).toBe(false);
      expect(isBuiltinModule('lodash')).toBe(false);
      expect(isBuiltinModule('./module')).toBe(false);
    });
  });

  describe('extractPackageName', () => {
    it('extracts package name from simple imports', () => {
      expect(extractPackageName('react')).toBe('react');
      expect(extractPackageName('lodash')).toBe('lodash');
    });

    it('extracts package name from subpath imports', () => {
      expect(extractPackageName('lodash/map')).toBe('lodash');
      expect(extractPackageName('react-dom/client')).toBe('react-dom');
    });

    it('extracts scoped package names', () => {
      expect(extractPackageName('@types/node')).toBe('@types/node');
      expect(extractPackageName('@babel/core')).toBe('@babel/core');
      expect(extractPackageName('@types/react/index')).toBe('@types/react');
    });

    it('handles edge cases', () => {
      expect(extractPackageName('@org')).toBe('@org');
      expect(extractPackageName('single')).toBe('single');
    });
  });
});

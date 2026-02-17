import * as path from 'path';
import type {
  InternalFileCategory,
  ExternalPackageCategory,
  NodeType,
} from '../types/dependency-graph';

const PACKAGE_CATEGORIES: Record<string, ExternalPackageCategory> = {
  // Frameworks
  react: 'framework',
  'react-dom': 'framework',
  next: 'framework',
  vue: 'framework',
  nuxt: 'framework',
  svelte: 'framework',
  angular: 'framework',
  '@angular/core': 'framework',
  'solid-js': 'framework',
  preact: 'framework',

  // State Management
  redux: 'state',
  '@reduxjs/toolkit': 'state',
  'react-redux': 'state',
  zustand: 'state',
  jotai: 'state',
  recoil: 'state',
  mobx: 'state',
  'mobx-react': 'state',
  valtio: 'state',
  xstate: 'state',
  '@tanstack/react-query': 'state',
  'react-query': 'state',
  swr: 'state',

  // Networking
  axios: 'networking',
  ky: 'networking',
  got: 'networking',
  'node-fetch': 'networking',
  'isomorphic-fetch': 'networking',
  'cross-fetch': 'networking',
  graphql: 'networking',
  '@apollo/client': 'networking',
  urql: 'networking',
  'socket.io': 'networking',
  'socket.io-client': 'networking',
  ws: 'networking',

  // UI Libraries
  '@chakra-ui/react': 'ui',
  '@mui/material': 'ui',
  '@mui/icons-material': 'ui',
  '@emotion/react': 'ui',
  '@emotion/styled': 'ui',
  'styled-components': 'ui',
  tailwindcss: 'ui',
  '@headlessui/react': 'ui',
  '@radix-ui/react': 'ui',
  antd: 'ui',
  'framer-motion': 'ui',
  'react-spring': 'ui',
  clsx: 'ui',
  classnames: 'ui',

  // Utilities
  lodash: 'utility',
  underscore: 'utility',
  ramda: 'utility',
  'date-fns': 'utility',
  dayjs: 'utility',
  moment: 'utility',
  zod: 'utility',
  yup: 'utility',
  joi: 'utility',
  uuid: 'utility',
  nanoid: 'utility',
  immer: 'utility',

  // Testing
  jest: 'testing',
  vitest: 'testing',
  '@testing-library/react': 'testing',
  '@testing-library/jest-dom': 'testing',
  mocha: 'testing',
  chai: 'testing',
  sinon: 'testing',
  cypress: 'testing',
  playwright: 'testing',
  '@playwright/test': 'testing',

  // Build Tools
  vite: 'build',
  webpack: 'build',
  esbuild: 'build',
  rollup: 'build',
  parcel: 'build',
  tsup: 'build',
  turbo: 'build',
};

export function categorizeInternalFile(filePath: string): InternalFileCategory {
  const normalized = filePath.toLowerCase().replace(/\\/g, '/');
  const basename = path.basename(filePath, path.extname(filePath)).toLowerCase();
  const dirname = path.dirname(normalized);

  // Test files
  if (
    normalized.includes('__test__') ||
    normalized.includes('__tests__') ||
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    basename.endsWith('.test') ||
    basename.endsWith('.spec')
  ) {
    return 'test';
  }

  // Type definitions
  if (
    normalized.includes('/types/') ||
    normalized.includes('/types.') ||
    basename.endsWith('-types') ||
    basename.endsWith('.d')
  ) {
    return 'type';
  }

  // Schemas
  if (
    normalized.includes('/schema/') ||
    normalized.includes('/schemas/') ||
    basename.includes('schema')
  ) {
    return 'schema';
  }

  // Config files
  if (
    basename.includes('config') ||
    basename.includes('.config') ||
    basename === 'env' ||
    basename.startsWith('.')
  ) {
    return 'config';
  }

  // Constants
  if (
    normalized.includes('/constant/') ||
    normalized.includes('/constants/') ||
    basename.includes('constant')
  ) {
    return 'constant';
  }

  // Pages / Routes
  if (
    normalized.includes('/pages/') ||
    normalized.includes('/app/') ||
    normalized.includes('/routes/') ||
    basename === 'page' ||
    basename === 'layout' ||
    basename === 'route'
  ) {
    return 'page';
  }

  // Components
  if (
    normalized.includes('/components/') ||
    normalized.includes('/component/') ||
    /^[A-Z]/.test(path.basename(filePath, path.extname(filePath))) // PascalCase
  ) {
    return 'component';
  }

  // Hooks
  if (
    normalized.includes('/hooks/') ||
    normalized.includes('/hook/') ||
    basename.startsWith('use')
  ) {
    return 'hook';
  }

  // Services
  if (
    normalized.includes('/services/') ||
    normalized.includes('/service/') ||
    normalized.includes('/api/') ||
    basename.includes('service') ||
    basename.includes('api')
  ) {
    return 'service';
  }

  // Methods / Logic
  if (
    normalized.includes('/methods/') ||
    normalized.includes('/logic/') ||
    basename.includes('logic') ||
    basename.includes('method')
  ) {
    return 'method';
  }

  // Utils / Helpers
  if (
    normalized.includes('/utils/') ||
    normalized.includes('/util/') ||
    normalized.includes('/helpers/') ||
    normalized.includes('/helper/') ||
    normalized.includes('/lib/') ||
    basename.includes('util') ||
    basename.includes('helper')
  ) {
    return 'util';
  }

  return 'unknown';
}

export function categorizeExternalPackage(packageName: string): ExternalPackageCategory {
  // Direct lookup
  if (PACKAGE_CATEGORIES[packageName]) {
    return PACKAGE_CATEGORIES[packageName];
  }

  // Check for scoped package prefixes
  for (const [pkg, category] of Object.entries(PACKAGE_CATEGORIES)) {
    if (packageName.startsWith(`${pkg}/`)) {
      return category;
    }
  }

  // Heuristic checks
  if (
    packageName.includes('react') ||
    packageName.includes('vue') ||
    packageName.includes('angular')
  ) {
    return 'framework';
  }

  if (
    packageName.includes('test') ||
    packageName.includes('mock') ||
    packageName.includes('stub')
  ) {
    return 'testing';
  }

  if (
    packageName.includes('plugin') ||
    packageName.includes('loader') ||
    packageName.includes('webpack')
  ) {
    return 'build';
  }

  if (packageName.startsWith('@types/')) {
    return 'utility';
  }

  return 'other';
}

export function determineNodeType(
  importPath: string,
  isRelative: boolean,
  isDynamic: boolean,
  isBuiltin: boolean
): NodeType {
  if (isDynamic) return 'dynamic';
  if (isBuiltin) return 'builtin';
  if (isRelative) return 'internal';
  return 'external';
}

export function isEntryFile(filePath: string): boolean {
  const basename = path.basename(filePath, path.extname(filePath)).toLowerCase();
  const normalized = filePath.toLowerCase().replace(/\\/g, '/');

  return (
    basename === 'index' ||
    basename === 'main' ||
    basename === 'app' ||
    basename === 'page' ||
    basename === 'layout' ||
    basename === 'route' ||
    normalized.includes('/pages/') ||
    (normalized.includes('/app/') && (basename === 'page' || basename === 'layout'))
  );
}

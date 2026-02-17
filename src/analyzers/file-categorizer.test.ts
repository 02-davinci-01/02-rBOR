import { describe, it, expect } from 'vitest';
import {
  categorizeInternalFile,
  categorizeExternalPackage,
  determineNodeType,
  isEntryFile,
} from './file-categorizer';

describe('file-categorizer', () => {
  describe('categorizeInternalFile', () => {
    it('categorizes test files', () => {
      expect(categorizeInternalFile('src/__tests__/utils.test.ts')).toBe('test');
      expect(categorizeInternalFile('src/components/Button.spec.tsx')).toBe('test');
      expect(categorizeInternalFile('tests/unit/helper.test.js')).toBe('test');
    });

    it('categorizes type files', () => {
      expect(categorizeInternalFile('src/types/user.ts')).toBe('type');
      expect(categorizeInternalFile('src/models/user-types.ts')).toBe('type');
      expect(categorizeInternalFile('src/types.d.ts')).toBe('type');
    });

    it('categorizes schema files', () => {
      expect(categorizeInternalFile('src/schema/user-schema.ts')).toBe('schema');
      expect(categorizeInternalFile('src/schemas/validation.ts')).toBe('schema');
    });

    it('categorizes config files', () => {
      expect(categorizeInternalFile('.env')).toBe('config');
      expect(categorizeInternalFile('src/config.ts')).toBe('config');
      expect(categorizeInternalFile('app.config.js')).toBe('config');
    });

    it('categorizes constant files', () => {
      expect(categorizeInternalFile('src/constants/api.ts')).toBe('constant');
      expect(categorizeInternalFile('src/utils/constant/endpoints.ts')).toBe('constant');
    });

    it('categorizes page files', () => {
      expect(categorizeInternalFile('src/pages/index.tsx')).toBe('page');
      expect(categorizeInternalFile('app/dashboard/page.tsx')).toBe('page');
      expect(categorizeInternalFile('src/routes/home/layout.tsx')).toBe('page');
    });

    it('categorizes component files', () => {
      expect(categorizeInternalFile('src/components/Button.tsx')).toBe('component');
      expect(categorizeInternalFile('src/UserProfile.tsx')).toBe('component');
      expect(categorizeInternalFile('components/Card.jsx')).toBe('component');
    });

    it('categorizes hook files', () => {
      expect(categorizeInternalFile('src/hooks/useAuth.ts')).toBe('hook');
      expect(categorizeInternalFile('src/useLocalStorage.ts')).toBe('hook');
    });

    it('categorizes service files', () => {
      expect(categorizeInternalFile('src/services/auth-service.ts')).toBe('service');
      expect(categorizeInternalFile('src/api/client.ts')).toBe('service');
    });

    it('categorizes method/logic files', () => {
      expect(categorizeInternalFile('src/methods/auth-logic.ts')).toBe('method');
      expect(categorizeInternalFile('src/logic/validation.ts')).toBe('method');
    });

    it('categorizes util files', () => {
      expect(categorizeInternalFile('src/utils/format.ts')).toBe('util');
      expect(categorizeInternalFile('src/helpers/date.ts')).toBe('util');
      expect(categorizeInternalFile('src/lib/common.ts')).toBe('util');
    });

    it('returns unknown for unrecognized files', () => {
      expect(categorizeInternalFile('src/random-file.ts')).toBe('unknown');
      expect(categorizeInternalFile('data/file.json')).toBe('unknown');
    });
  });

  describe('categorizeExternalPackage', () => {
    it('categorizes framework packages', () => {
      expect(categorizeExternalPackage('react')).toBe('framework');
      expect(categorizeExternalPackage('react-dom')).toBe('framework');
      expect(categorizeExternalPackage('next')).toBe('framework');
      expect(categorizeExternalPackage('vue')).toBe('framework');
      expect(categorizeExternalPackage('@angular/core')).toBe('framework');
    });

    it('categorizes state management packages', () => {
      expect(categorizeExternalPackage('redux')).toBe('state');
      expect(categorizeExternalPackage('@reduxjs/toolkit')).toBe('state');
      expect(categorizeExternalPackage('zustand')).toBe('state');
      expect(categorizeExternalPackage('@tanstack/react-query')).toBe('state');
    });

    it('categorizes networking packages', () => {
      expect(categorizeExternalPackage('axios')).toBe('networking');
      expect(categorizeExternalPackage('ky')).toBe('networking');
      expect(categorizeExternalPackage('graphql')).toBe('networking');
      expect(categorizeExternalPackage('@apollo/client')).toBe('networking');
    });

    it('categorizes UI packages', () => {
      expect(categorizeExternalPackage('@chakra-ui/react')).toBe('ui');
      expect(categorizeExternalPackage('@mui/material')).toBe('ui');
      expect(categorizeExternalPackage('styled-components')).toBe('ui');
      expect(categorizeExternalPackage('tailwindcss')).toBe('ui');
    });

    it('categorizes utility packages', () => {
      expect(categorizeExternalPackage('lodash')).toBe('utility');
      expect(categorizeExternalPackage('date-fns')).toBe('utility');
      expect(categorizeExternalPackage('zod')).toBe('utility');
      expect(categorizeExternalPackage('uuid')).toBe('utility');
    });

    it('categorizes testing packages', () => {
      expect(categorizeExternalPackage('jest')).toBe('testing');
      expect(categorizeExternalPackage('vitest')).toBe('testing');
      expect(categorizeExternalPackage('@testing-library/react')).toBe('testing');
      expect(categorizeExternalPackage('playwright')).toBe('testing');
    });

    it('categorizes build tools', () => {
      expect(categorizeExternalPackage('vite')).toBe('build');
      expect(categorizeExternalPackage('webpack')).toBe('build');
      expect(categorizeExternalPackage('esbuild')).toBe('build');
    });

    it('categorizes type packages as utility', () => {
      expect(categorizeExternalPackage('@types/node')).toBe('utility');
      // @types/* packages are categorized as utility by the @types/ heuristic
      expect(categorizeExternalPackage('@types/lodash')).toBe('utility');
    });

    it('uses heuristics for unknown packages', () => {
      expect(categorizeExternalPackage('react-custom-lib')).toBe('framework');
      expect(categorizeExternalPackage('test-utils')).toBe('testing');
      expect(categorizeExternalPackage('webpack-plugin-xyz')).toBe('build');
    });

    it('returns other for completely unknown packages', () => {
      expect(categorizeExternalPackage('unknown-package')).toBe('other');
      expect(categorizeExternalPackage('my-custom-lib')).toBe('other');
    });
  });

  describe('determineNodeType', () => {
    it('identifies dynamic imports', () => {
      expect(determineNodeType('module', false, true, false)).toBe('dynamic');
    });

    it('identifies builtin modules', () => {
      expect(determineNodeType('fs', false, false, true)).toBe('builtin');
    });

    it('identifies internal modules', () => {
      expect(determineNodeType('./utils', true, false, false)).toBe('internal');
    });

    it('identifies external modules', () => {
      expect(determineNodeType('react', false, false, false)).toBe('external');
    });
  });

  describe('isEntryFile', () => {
    it('identifies index files as entry points', () => {
      expect(isEntryFile('src/index.tsx')).toBe(true);
      expect(isEntryFile('components/Button/index.ts')).toBe(true);
    });

    it('identifies main files as entry points', () => {
      expect(isEntryFile('src/main.tsx')).toBe(true);
    });

    it('identifies app files as entry points', () => {
      expect(isEntryFile('src/app.tsx')).toBe(true);
    });

    it('identifies page and layout files as entry points', () => {
      expect(isEntryFile('app/dashboard/page.tsx')).toBe(true);
      expect(isEntryFile('app/layout.tsx')).toBe(true);
    });

    it('rejects non-entry files', () => {
      expect(isEntryFile('src/utils/helper.ts')).toBe(false);
      expect(isEntryFile('components/Button.tsx')).toBe(false);
    });
  });
});

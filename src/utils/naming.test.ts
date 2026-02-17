import { describe, it, expect } from 'vitest';
import {
  toPascalCase,
  toKebabCase,
  toHooks,
  toComponentFile,
  toMethodsFile,
  toServicesFile,
  toTypesFile,
  toUtilsFiles,
} from './naming';

describe('naming utils', () => {
  describe('toPascalCase', () => {
    it('converts kebab-case to PascalCase', () => {
      expect(toPascalCase('user-profile')).toBe('UserProfile');
    });

    it('converts snake_case to PascalCase', () => {
      expect(toPascalCase('user_profile')).toBe('UserProfile');
    });

    it('converts space-separated to PascalCase', () => {
      expect(toPascalCase('user profile')).toBe('UserProfile');
    });

    it('handles mixed separators', () => {
      expect(toPascalCase('user-profile_settings')).toBe('UserProfileSettings');
    });

    it('handles single word', () => {
      expect(toPascalCase('user')).toBe('User');
    });

    it('preserves existing PascalCase', () => {
      expect(toPascalCase('UserProfile')).toBe('UserProfile');
    });
  });

  describe('toKebabCase', () => {
    it('converts PascalCase to kebab-case', () => {
      expect(toKebabCase('UserProfile')).toBe('user-profile');
    });

    it('converts camelCase to kebab-case', () => {
      expect(toKebabCase('userProfile')).toBe('user-profile');
    });

    it('converts snake_case to kebab-case', () => {
      expect(toKebabCase('user_profile')).toBe('user-profile');
    });

    it('converts spaces to kebab-case', () => {
      expect(toKebabCase('user profile')).toBe('user-profile');
    });

    it('handles single word', () => {
      expect(toKebabCase('user')).toBe('user');
    });

    it('preserves existing kebab-case', () => {
      expect(toKebabCase('user-profile')).toBe('user-profile');
    });
  });

  describe('toHooks', () => {
    it('generates hook file names', () => {
      const hooks = toHooks('user-profile');
      expect(hooks).toEqual([
        'useUserProfile.ts',
        'useUserProfileData.ts',
        'useUserProfileAction.ts',
      ]);
    });

    it('handles single word domain', () => {
      const hooks = toHooks('auth');
      expect(hooks).toEqual(['useAuth.ts', 'useAuthData.ts', 'useAuthAction.ts']);
    });
  });

  describe('toComponentFile', () => {
    it('generates component file name', () => {
      expect(toComponentFile('user-profile')).toBe('UserProfile.tsx');
    });

    it('handles single word', () => {
      expect(toComponentFile('auth')).toBe('Auth.tsx');
    });
  });

  describe('toMethodsFile', () => {
    it('generates methods file name', () => {
      expect(toMethodsFile('user-profile')).toBe('user-profile-logic.ts');
    });

    it('converts PascalCase input', () => {
      expect(toMethodsFile('UserProfile')).toBe('user-profile-logic.ts');
    });
  });

  describe('toServicesFile', () => {
    it('generates service file name', () => {
      expect(toServicesFile('user-profile')).toBe('user-profile-service.ts');
    });

    it('converts PascalCase input', () => {
      expect(toServicesFile('UserProfile')).toBe('user-profile-service.ts');
    });
  });

  describe('toTypesFile', () => {
    it('generates types file name', () => {
      expect(toTypesFile('user-profile')).toBe('user-profile-types.ts');
    });
  });

  describe('toUtilsFiles', () => {
    it('generates both helper and constant file names', () => {
      const files = toUtilsFiles('user-profile');
      expect(files).toEqual({
        helper: 'user-profile-helpers.ts',
        constant: 'user-profile-constants.ts',
      });
    });

    it('handles single word domain', () => {
      const files = toUtilsFiles('auth');
      expect(files).toEqual({
        helper: 'auth-helpers.ts',
        constant: 'auth-constants.ts',
      });
    });
  });
});

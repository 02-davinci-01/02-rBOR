import * as fs from 'fs';
import * as path from 'path';
import type { HttpClient } from '../cli';

export interface RborConfig {
  http: HttpClient;
  domainsPath: string;
  infrastructurePath: string;
  schema: {
    library: 'zod' | 'yup' | 'none';
  };
}

export const DEFAULT_CONFIG: RborConfig = {
  http: 'axios',
  domainsPath: 'domains',
  infrastructurePath: 'infrastructure',
  schema: {
    library: 'zod',
  },
};

const CONFIG_FILE_NAME = '.rborrc.json';

export function findProjectRoot(startDir: string = process.cwd()): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

export function loadConfig(projectRoot?: string): RborConfig {
  const root = projectRoot ?? findProjectRoot();

  const rcPath = path.join(root, CONFIG_FILE_NAME);
  if (fs.existsSync(rcPath)) {
    try {
      const raw = fs.readFileSync(rcPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return mergeConfig(DEFAULT_CONFIG, parsed);
    } catch (e) {
      console.warn(
        `Warning: Failed to parse ${CONFIG_FILE_NAME}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw);
      if (pkg.rbor && typeof pkg.rbor === 'object') {
        return mergeConfig(DEFAULT_CONFIG, pkg.rbor);
      }
    } catch {}
  }

  return { ...DEFAULT_CONFIG };
}

export function configExists(projectRoot?: string): boolean {
  const root = projectRoot ?? findProjectRoot();
  const rcPath = path.join(root, CONFIG_FILE_NAME);

  if (fs.existsSync(rcPath)) return true;

  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw);
      return pkg.rbor !== undefined;
    } catch {
      return false;
    }
  }

  return false;
}

export function writeConfig(config: RborConfig, projectRoot?: string): string {
  const root = projectRoot ?? findProjectRoot();
  const rcPath = path.join(root, CONFIG_FILE_NAME);
  fs.writeFileSync(rcPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return rcPath;
}

export function getDomainsPath(config?: RborConfig): string {
  const cfg = config ?? loadConfig();
  return path.resolve(findProjectRoot(), cfg.domainsPath);
}

export function getInfrastructurePath(config?: RborConfig): string {
  const cfg = config ?? loadConfig();
  return path.resolve(findProjectRoot(), cfg.infrastructurePath);
}

function mergeConfig(base: RborConfig, override: Partial<RborConfig>): RborConfig {
  return {
    http: isValidHttpClient(override.http) ? override.http : base.http,
    domainsPath: typeof override.domainsPath === 'string' ? override.domainsPath : base.domainsPath,
    infrastructurePath:
      typeof override.infrastructurePath === 'string'
        ? override.infrastructurePath
        : base.infrastructurePath,
    schema: {
      library: isValidSchemaLib(override.schema?.library)
        ? override.schema!.library
        : base.schema.library,
    },
  };
}

function isValidHttpClient(value: unknown): value is HttpClient {
  return value === 'axios' || value === 'fetch' || value === 'ky';
}

function isValidSchemaLib(value: unknown): value is 'zod' | 'yup' | 'none' {
  return value === 'zod' || value === 'yup' || value === 'none';
}

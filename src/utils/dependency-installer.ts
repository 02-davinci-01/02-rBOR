import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export function detectPackageManager(): PackageManager {
  const cwd = process.cwd();

  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  return 'npm';
}

export function installDependency(packageName: string, isDev: boolean = false): void {
  const pm = detectPackageManager();

  let command: string;

  switch (pm) {
    case 'pnpm':
      command = `pnpm add ${isDev ? '-D' : ''} ${packageName}`;
      break;
    case 'yarn':
      command = `yarn add ${isDev ? '-D' : ''} ${packageName}`;
      break;
    default:
      command = `npm install ${isDev ? '--save-dev' : ''} ${packageName}`;
  }

  console.log(`  📦 Installing ${packageName}...`);

  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`  ✅ Installed ${packageName}`);
  } catch (error) {
    console.error(`  ❌ Failed to install ${packageName}`);
    throw error;
  }
}

export function isDependencyInstalled(packageName: string): boolean {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    return packageName in deps || packageName in devDeps;
  } catch {
    return false;
  }
}

export function ensureDependency(packageName: string, isDev: boolean = false): void {
  if (isDependencyInstalled(packageName)) {
    console.log(`  ✅ ${packageName} already installed`);
    return;
  }

  installDependency(packageName, isDev);
}

import * as fs from 'fs';
import * as path from 'path';

export function findFileInRepo(
  dir: string,
  filename: string,
  maxDepth: number = 10
): string | null {
  if (maxDepth < 0) return null;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          continue;
        }

        const found = findFileInRepo(fullPath, filename, maxDepth - 1);
        if (found) return found;
      }

      if (entry.isFile() && entry.name === filename) {
        return fullPath;
      }
    }
  } catch {}

  return null;
}

export function findBaseService(startDir: string = process.cwd()): {
  exists: boolean;
  path: string | null;
} {
  const baseServicePath = findFileInRepo(startDir, 'BaseService.ts');

  return {
    exists: baseServicePath !== null,
    path: baseServicePath,
  };
}

export function getRelativeImportPath(from: string, to: string): string {
  const fromDir = path.dirname(from);
  let relativePath = path.relative(fromDir, to);

  relativePath = relativePath.replace(/\\/g, '/').replace(/\.ts$/, '');

  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  return relativePath;
}

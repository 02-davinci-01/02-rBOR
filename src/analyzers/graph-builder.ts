import * as fs from 'fs';
import * as path from 'path';
import {
  parseFile,
  isRelativeImport,
  isAliasImport,
  isBuiltinModule,
  extractPackageName,
} from './import-parser';
import {
  categorizeInternalFile,
  categorizeExternalPackage,
  determineNodeType,
  isEntryFile,
} from './file-categorizer';
import type {
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  GraphMetadata,
  GraphStats,
  AnalysisOptions,
  ParsedImport,
  NodeType,
  DEFAULT_ANALYSIS_OPTIONS,
} from '../types/dependency-graph';

function resolveImportPath(
  importSource: string,
  fromFile: string,
  options: Required<Omit<AnalysisOptions, 'entry' | 'direction'>>
): string | null {
  const fromDir = path.dirname(fromFile);

  // Handle relative imports
  if (isRelativeImport(importSource)) {
    return resolveFilePath(path.resolve(fromDir, importSource), options.extensions);
  }

  // Handle alias imports
  for (const [alias, target] of Object.entries(options.aliases)) {
    if (importSource.startsWith(alias)) {
      const resolvedPath = importSource.replace(alias, target);
      const absolutePath = path.resolve(process.cwd(), resolvedPath);
      return resolveFilePath(absolutePath, options.extensions);
    }
  }

  // External package or builtin - return as-is
  return null;
}

function resolveFilePath(basePath: string, extensions: string[]): string | null {
  // Check if exact path exists
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return fs.realpathSync(basePath);
  }

  // Try with extensions
  for (const ext of extensions) {
    const withExt = `${basePath}${ext}`;
    if (fs.existsSync(withExt)) {
      return fs.realpathSync(withExt);
    }
  }

  // Try as directory with index file
  for (const ext of extensions) {
    const indexPath = path.join(basePath, `index${ext}`);
    if (fs.existsSync(indexPath)) {
      return fs.realpathSync(indexPath);
    }
  }

  return null;
}

function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return excludePatterns.some(pattern => normalized.includes(pattern));
}

function findProjectRoot(entryPath: string): string {
  const markers = ['package.json', 'tsconfig.json', '.git', 'node_modules'];
  let currentDir = path.dirname(path.resolve(entryPath));

  // Go up the directory tree looking for project markers
  for (let i = 0; i < 10; i++) {
    for (const marker of markers) {
      const markerPath = path.join(currentDir, marker);
      if (fs.existsSync(markerPath)) {
        return currentDir;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
  }

  // Fallback: go up 3 directories from entry
  let fallback = path.dirname(path.resolve(entryPath));
  for (let i = 0; i < 3; i++) {
    const parent = path.dirname(fallback);
    if (parent !== fallback) {
      fallback = parent;
    }
  }

  return fallback;
}

function hasValidExtension(filePath: string, extensions: string[]): boolean {
  const ext = path.extname(filePath);
  return extensions.includes(ext);
}

export function buildDependencyGraph(options: AnalysisOptions): DependencyGraph {
  const config = {
    maxDepth: options.maxDepth ?? 10,
    includeNodeModules: options.includeNodeModules ?? false,
    includeTypeImports: options.includeTypeImports ?? true,
    includeTests: options.includeTests ?? false,
    extensions: options.extensions ?? ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    excludePatterns: options.excludePatterns ?? [
      'node_modules',
      'dist',
      'build',
      '.next',
      '.git',
      'coverage',
    ],
    aliases: options.aliases ?? {},
  };

  const nodes = new Map<string, DependencyNode>();
  const edges: DependencyEdge[] = [];
  const visited = new Set<string>();
  const circularDependencies: string[][] = [];

  // Resolve entry point(s)
  const entryPath = path.resolve(options.entry);
  const entryPoints: string[] = [];

  if (fs.statSync(entryPath).isDirectory()) {
    // Scan directory for entry files
    const files = scanDirectory(
      entryPath,
      config.extensions,
      config.excludePatterns,
      config.includeTests
    );
    entryPoints.push(...files);
  } else {
    entryPoints.push(entryPath);
  }

  // Build graph based on direction
  if (options.direction === 'forward') {
    for (const entry of entryPoints) {
      traverseForward(entry, nodes, edges, visited, circularDependencies, config, 0, []);
    }
  } else {
    // For reverse or both, we need to build the full forward graph first
    // by scanning all files in the project

    // Find the project root by looking for common markers
    const scanRoot = findProjectRoot(entryPath);
    const allFiles = scanDirectory(
      scanRoot,
      config.extensions,
      config.excludePatterns,
      config.includeTests
    );

    for (const file of allFiles) {
      traverseForward(file, nodes, edges, visited, circularDependencies, config, 0, []);
    }

    // For 'reverse' only: filter to show who imports the entry points
    // For 'both': keep all edges (used by summary format)
    if (options.direction === 'reverse') {
      filterReverseGraph(entryPoints, nodes, edges);
    } else {
      // 'both' direction: filter to keep only edges related to entry points
      filterBothDirections(entryPoints, nodes, edges);
    }
  }

  // Build metadata
  const metadata: GraphMetadata = {
    direction: options.direction,
    entryPoints,
    maxDepth: config.maxDepth,
    actualDepth: calculateActualDepth(edges, entryPoints),
    analyzedAt: new Date().toISOString(),
    projectRoot: process.cwd(),
    totalFiles: [...nodes.values()].filter(n => n.type === 'internal').length,
    totalPackages: [...nodes.values()].filter(n => n.type === 'external').length,
    circularDependencies,
  };

  // Compute statistics
  const stats = computeStats(nodes, edges);

  return {
    nodes: [...nodes.values()],
    edges,
    metadata,
    stats,
  };
}

function traverseForward(
  filePath: string,
  nodes: Map<string, DependencyNode>,
  edges: DependencyEdge[],
  visited: Set<string>,
  circularDependencies: string[][],
  config: Required<Omit<AnalysisOptions, 'entry' | 'direction'>>,
  depth: number,
  currentPath: string[]
): void {
  if (depth > config.maxDepth) return;
  if (visited.has(filePath)) return;
  if (shouldExclude(filePath, config.excludePatterns)) return;
  if (!hasValidExtension(filePath, config.extensions)) return;

  // Check for circular dependency
  const pathIndex = currentPath.indexOf(filePath);
  if (pathIndex !== -1) {
    const cycle = currentPath.slice(pathIndex);
    cycle.push(filePath);
    circularDependencies.push(cycle);
    return;
  }

  visited.add(filePath);

  // Create node for this file
  const nodeId = normalizePathForId(filePath);
  if (!nodes.has(nodeId)) {
    nodes.set(nodeId, createInternalNode(filePath));
  }

  // Parse the file
  const parseResult = parseFile(filePath);

  // Process each import
  for (const imp of parseResult.imports) {
    // Skip type-only imports if configured
    if (!config.includeTypeImports && imp.importKind === 'type-only') {
      continue;
    }

    const { node: targetNode, resolved } = resolveImportToNode(imp, filePath, config);

    if (!targetNode) continue;

    // Skip external packages if not included
    if (targetNode.type === 'external' && !config.includeNodeModules) {
      // Still add the node and edge, but don't traverse into it
      if (!nodes.has(targetNode.id)) {
        nodes.set(targetNode.id, targetNode);
      }
      edges.push(createEdge(nodeId, targetNode.id, imp, circularDependencies));
      continue;
    }

    // Skip builtins
    if (targetNode.type === 'builtin') {
      if (!nodes.has(targetNode.id)) {
        nodes.set(targetNode.id, targetNode);
      }
      edges.push(createEdge(nodeId, targetNode.id, imp, circularDependencies));
      continue;
    }

    // Add target node
    if (!nodes.has(targetNode.id)) {
      nodes.set(targetNode.id, targetNode);
    }

    // Create edge
    edges.push(createEdge(nodeId, targetNode.id, imp, circularDependencies));

    // Recursively traverse internal files
    if (targetNode.type === 'internal' && resolved) {
      traverseForward(resolved, nodes, edges, visited, circularDependencies, config, depth + 1, [
        ...currentPath,
        filePath,
      ]);
    }
  }
}

function resolveImportToNode(
  imp: ParsedImport,
  fromFile: string,
  config: Required<Omit<AnalysisOptions, 'entry' | 'direction'>>
): { node: DependencyNode | null; resolved: string | null } {
  const source = imp.source;

  // Check for builtin
  if (isBuiltinModule(source)) {
    return {
      node: {
        id: `builtin:${source}`,
        label: source,
        path: source,
        type: 'builtin',
        category: 'other',
      },
      resolved: null,
    };
  }

  // Check for relative or alias import
  if (isRelativeImport(source) || isAliasImport(source, config.aliases)) {
    const resolved = resolveImportPath(source, fromFile, config);
    if (resolved) {
      return {
        node: createInternalNode(resolved),
        resolved,
      };
    }
    // Could not resolve - might be missing file
    return { node: null, resolved: null };
  }

  // External package
  const packageName = extractPackageName(source);
  return {
    node: {
      id: `npm:${packageName}`,
      label: packageName,
      path: packageName,
      type: 'external',
      category: categorizeExternalPackage(packageName),
    },
    resolved: null,
  };
}

function createInternalNode(filePath: string): DependencyNode {
  const normalized = normalizePathForId(filePath);
  const basename = path.basename(filePath);

  return {
    id: normalized,
    label: basename,
    path: filePath,
    type: 'internal',
    category: categorizeInternalFile(filePath),
    extension: path.extname(filePath),
    isEntry: isEntryFile(filePath),
  };
}

function createEdge(
  source: string,
  target: string,
  imp: ParsedImport,
  circularDependencies: string[][]
): DependencyEdge {
  const isCircular = circularDependencies.some(
    cycle => cycle.includes(source) && cycle.includes(target)
  );

  return {
    source,
    target,
    importType: imp.importType,
    importKind: imp.importKind,
    specifiers: imp.specifiers,
    rawImport: imp.raw,
    line: imp.line,
    isCircular,
  };
}

function normalizePathForId(filePath: string): string {
  const relative = path.relative(process.cwd(), filePath);
  return relative.replace(/\\/g, '/');
}

function scanDirectory(
  dir: string,
  extensions: string[],
  excludePatterns: string[],
  includeTests: boolean
): string[] {
  const files: string[] = [];

  function scan(currentDir: string): void {
    if (shouldExclude(currentDir, excludePatterns)) return;

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile()) {
          if (hasValidExtension(fullPath, extensions)) {
            if (!includeTests && isTestFile(fullPath)) continue;
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Directory not readable
    }
  }

  scan(dir);
  return files;
}

function isTestFile(filePath: string): boolean {
  const normalized = filePath.toLowerCase();
  return (
    normalized.includes('__test__') ||
    normalized.includes('__tests__') ||
    normalized.includes('.test.') ||
    normalized.includes('.spec.')
  );
}

function filterReverseGraph(
  entryPoints: string[],
  nodes: Map<string, DependencyNode>,
  edges: DependencyEdge[]
): void {
  const entryIds = new Set(entryPoints.map(e => normalizePathForId(e)));

  // For reverse analysis, we ONLY want:
  // 1. The target file(s) (entry points)
  // 2. Files that DIRECTLY import the target file(s)
  // 3. The edges between them

  const relevantNodes = new Set<string>();
  const relevantEdgeIndices = new Set<number>();

  // Add entry points
  for (const id of entryIds) {
    relevantNodes.add(id);
  }

  // Find ONLY direct importers (files that import the entry points)
  edges.forEach((edge, index) => {
    if (entryIds.has(edge.target)) {
      relevantNodes.add(edge.source);
      relevantEdgeIndices.add(index);
    }
  });

  // Remove all irrelevant nodes
  for (const [id] of nodes) {
    if (!relevantNodes.has(id)) {
      nodes.delete(id);
    }
  }

  // Remove all irrelevant edges (keep only edges where source imports target entry)
  // We need to splice in reverse order to maintain indices
  const indicesToRemove = [...edges.keys()].filter(i => !relevantEdgeIndices.has(i));
  for (let i = indicesToRemove.length - 1; i >= 0; i--) {
    edges.splice(indicesToRemove[i], 1);
  }
}

function filterBothDirections(
  entryPoints: string[],
  nodes: Map<string, DependencyNode>,
  edges: DependencyEdge[]
): void {
  const entryIds = new Set(entryPoints.map(e => normalizePathForId(e)));

  const relevantNodes = new Set<string>();
  const relevantEdgeIndices = new Set<number>();

  // Add entry points
  for (const id of entryIds) {
    relevantNodes.add(id);
  }

  // Find edges where entry is source (what entry imports) OR target (what imports entry)
  edges.forEach((edge, index) => {
    if (entryIds.has(edge.source)) {
      // Entry imports this → outgoing edge
      relevantNodes.add(edge.target);
      relevantEdgeIndices.add(index);
    }
    if (entryIds.has(edge.target)) {
      // This imports entry → incoming edge
      relevantNodes.add(edge.source);
      relevantEdgeIndices.add(index);
    }
  });

  // Remove all irrelevant nodes
  for (const [id] of nodes) {
    if (!relevantNodes.has(id)) {
      nodes.delete(id);
    }
  }

  // Remove all irrelevant edges
  const indicesToRemove = [...edges.keys()].filter(i => !relevantEdgeIndices.has(i));
  for (let i = indicesToRemove.length - 1; i >= 0; i--) {
    edges.splice(indicesToRemove[i], 1);
  }
}

function calculateActualDepth(edges: DependencyEdge[], entryPoints: string[]): number {
  const entryIds = new Set(entryPoints.map(e => normalizePathForId(e)));
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  let maxDepth = 0;

  function dfs(node: string, depth: number, visited: Set<string>): void {
    if (visited.has(node)) return;
    visited.add(node);
    maxDepth = Math.max(maxDepth, depth);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, depth + 1, visited);
    }
  }

  for (const entry of entryIds) {
    dfs(entry, 0, new Set());
  }

  return maxDepth;
}

function computeStats(nodes: Map<string, DependencyNode>, edges: DependencyEdge[]): GraphStats {
  const nodesByType: Record<NodeType, number> = {
    internal: 0,
    external: 0,
    dynamic: 0,
    builtin: 0,
  };

  const edgesByImportType: Record<string, number> = {
    static: 0,
    dynamic: 0,
    require: 0,
    reexport: 0,
    'side-effect': 0,
  };

  // Count nodes by type
  for (const node of nodes.values()) {
    nodesByType[node.type]++;
  }

  // Count edges by import type
  for (const edge of edges) {
    edgesByImportType[edge.importType]++;
  }

  // Calculate most imported
  const importCounts = new Map<string, number>();
  for (const edge of edges) {
    importCounts.set(edge.target, (importCounts.get(edge.target) || 0) + 1);
  }

  const mostImported = [...importCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  // Calculate files with most imports
  const importerCounts = new Map<string, number>();
  for (const edge of edges) {
    importerCounts.set(edge.source, (importerCounts.get(edge.source) || 0) + 1);
  }

  const mostImports = [...importerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  // Find orphan nodes
  const hasIncoming = new Set(edges.map(e => e.target));
  const hasOutgoing = new Set(edges.map(e => e.source));
  const orphanNodes = [...nodes.keys()].filter(id => !hasIncoming.has(id) && !hasOutgoing.has(id));

  return {
    nodeCount: nodes.size,
    edgeCount: edges.length,
    nodesByType,
    edgesByImportType: edgesByImportType as Record<any, number>,
    mostImported,
    mostImports,
    orphanNodes,
  };
}

// Re-export for convenience
export { normalizePathForId };

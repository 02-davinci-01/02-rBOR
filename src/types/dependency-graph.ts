export type InternalFileCategory =
  | 'page'
  | 'component'
  | 'hook'
  | 'service'
  | 'util'
  | 'config'
  | 'type'
  | 'schema'
  | 'method'
  | 'constant'
  | 'test'
  | 'unknown';

export type ExternalPackageCategory =
  | 'framework'
  | 'state'
  | 'networking'
  | 'ui'
  | 'utility'
  | 'testing'
  | 'build'
  | 'other';

export type NodeType = 'internal' | 'external' | 'dynamic' | 'builtin';

export interface DependencyNode {
  id: string;
  label: string;
  path: string;
  type: NodeType;
  category: InternalFileCategory | ExternalPackageCategory;
  extension?: string;
  isEntry?: boolean;
  metadata?: Record<string, unknown>;
}

export type ImportType = 'static' | 'dynamic' | 'require' | 'reexport' | 'side-effect';

export type ImportKind = 'default' | 'named' | 'namespace' | 'side-effect' | 'type-only';

export interface DependencyEdge {
  source: string;
  target: string;
  importType: ImportType;
  importKind: ImportKind;
  specifiers: string[];
  rawImport: string;
  line?: number;
  isCircular?: boolean;
}

export type GraphDirection = 'forward' | 'reverse' | 'both';

export interface GraphMetadata {
  direction: GraphDirection;
  entryPoints: string[];
  maxDepth: number;
  actualDepth: number;
  analyzedAt: string;
  projectRoot: string;
  totalFiles: number;
  totalPackages: number;
  circularDependencies: string[][];
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<NodeType, number>;
  edgesByImportType: Record<ImportType, number>;
  mostImported: Array<{ id: string; count: number }>;
  mostImports: Array<{ id: string; count: number }>;
  orphanNodes: string[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  metadata: GraphMetadata;
  stats: GraphStats;
}

export interface AnalysisOptions {
  entry: string;
  direction: GraphDirection;
  maxDepth?: number;
  includeNodeModules?: boolean;
  includeTypeImports?: boolean;
  includeTests?: boolean;
  extensions?: string[];
  excludePatterns?: string[];
  aliases?: Record<string, string>;
}

export const DEFAULT_ANALYSIS_OPTIONS: Required<Omit<AnalysisOptions, 'entry' | 'direction'>> = {
  maxDepth: 10,
  includeNodeModules: false,
  includeTypeImports: true,
  includeTests: false,
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  excludePatterns: ['node_modules', 'dist', 'build', '.next', '.git', 'coverage'],
  aliases: {},
};

export type OutputFormat = 'json' | 'summary' | 'tree' | 'dot';

export interface DependencySummary {
  file: string;
  direction: GraphDirection;
  internal: Record<InternalFileCategory, string[]>;
  external: Record<ExternalPackageCategory, string[]>;
  dynamic: string[];
  circular: string[][];
}

export interface ParsedImport {
  source: string;
  importType: ImportType;
  importKind: ImportKind;
  specifiers: string[];
  defaultImport?: string;
  namespaceImport?: string;
  line: number;
  raw: string;
}

export interface FileParseResult {
  filePath: string;
  imports: ParsedImport[];
  exports: ParsedImport[];
  errors: string[];
}

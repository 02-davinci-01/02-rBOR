import * as fs from 'fs';
import * as path from 'path';
import { buildDependencyGraph } from '../analyzers';
import { loadConfig, getDomainsPath, findProjectRoot } from '../utils/config';
import type { AnalysisOptions, DependencyEdge, DependencyNode } from '../types/dependency-graph';

type Severity = 'error' | 'warning';

interface Violation {
  rule: string;
  severity: Severity;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface ValidateOptions {
  strict?: boolean;
}

/**
 * Layer order for the rBOR downward-dependency rule.
 *
 * Control flows UPWARD (higher layers orchestrate lower layers):
 *   page/component -> hook-data/hook-action -> hook-controller -> method -> service -> infrastructure
 *
 * Dependencies flow DOWNWARD (lower layers are independent):
 *   infrastructure is independent
 *   service depends on infrastructure
 *   method depends on service
 *   hook-controller depends on method
 *   hook-data / hook-action depend on hook-controller
 *   component depends on hooks
 *   page depends on component
 *
 * Types, schemas, constants, utils, and config are "layer 0" — importable by anyone.
 */
const LAYER_ORDER: Record<string, number> = {
  type: 0,
  schema: 0,
  constant: 0,
  config: 0,
  util: 0,
  infrastructure: 1,
  service: 2,
  method: 3,
  'hook-controller': 4,
  hook: 4, // generic hook treated same as controller
  'hook-data': 5,
  'hook-action': 5,
  component: 6,
  page: 7,
};

const UNRESTRICTED_CATEGORIES = new Set([
  'type',
  'schema',
  'constant',
  'config',
  'util',
  'unknown',
]);

/** Categories at the same layer that must remain independent (no sibling imports). */
const SIBLING_ISOLATION = new Map<string, Set<string>>([
  ['hook-data', new Set(['hook-action'])],
  ['hook-action', new Set(['hook-data'])],
]);

function checkCrossDomainImports(
  edges: DependencyEdge[],
  nodes: Map<string, DependencyNode>,
  domainsRelative: string
): Violation[] {
  const violations: Violation[] = [];
  const domainPrefix = domainsRelative.replace(/\\/g, '/');

  for (const edge of edges) {
    const sourceNode = nodes.get(edge.source);
    const targetNode = nodes.get(edge.target);

    if (!sourceNode || !targetNode) continue;
    if (sourceNode.type !== 'internal' || targetNode.type !== 'internal') continue;

    const sourceNorm = edge.source.replace(/\\/g, '/');
    const targetNorm = edge.target.replace(/\\/g, '/');

    // Both must be inside the domains folder
    if (!sourceNorm.startsWith(domainPrefix) || !targetNorm.startsWith(domainPrefix)) continue;

    const sourceRel = sourceNorm.slice(domainPrefix.length + 1);
    const targetRel = targetNorm.slice(domainPrefix.length + 1);

    const sourceDomain = sourceRel.split('/')[0];
    const targetDomain = targetRel.split('/')[0];

    if (sourceDomain && targetDomain && sourceDomain !== targetDomain) {
      violations.push({
        rule: 'no-cross-domain-import',
        severity: 'error',
        message: `Cross-domain import: "${sourceDomain}" imports from "${targetDomain}"`,
        file: edge.source,
        line: edge.line,
        suggestion: `Move shared code to a shared/ or infrastructure/ layer, or refactor to remove this dependency.`,
      });
    }
  }

  return violations;
}

function checkDownwardDependencies(
  edges: DependencyEdge[],
  nodes: Map<string, DependencyNode>
): Violation[] {
  const violations: Violation[] = [];

  for (const edge of edges) {
    const sourceNode = nodes.get(edge.source);
    const targetNode = nodes.get(edge.target);

    if (!sourceNode || !targetNode) continue;
    if (sourceNode.type !== 'internal' || targetNode.type !== 'internal') continue;

    const sourceCategory = sourceNode.category as string;
    const targetCategory = targetNode.category as string;

    // Skip unrestricted categories
    if (UNRESTRICTED_CATEGORIES.has(targetCategory)) continue;
    if (UNRESTRICTED_CATEGORIES.has(sourceCategory)) continue;

    const sourceLevel = LAYER_ORDER[sourceCategory];
    const targetLevel = LAYER_ORDER[targetCategory];

    if (sourceLevel === undefined || targetLevel === undefined) continue;

    // Violation: importing from a higher layer (higher number = higher layer)
    if (targetLevel > sourceLevel) {
      violations.push({
        rule: 'downward-only-deps',
        severity: 'error',
        message: `Upward dependency: ${sourceCategory} ("${sourceNode.label}") imports ${targetCategory} ("${targetNode.label}")`,
        file: edge.source,
        line: edge.line,
        suggestion: `Dependencies should only flow downward: page -> component -> hook-data/hook-action -> hook-controller -> method -> service -> infrastructure.`,
      });
    }

    // Violation: sibling isolation (e.g. hook-data must not import hook-action)
    const isolated = SIBLING_ISOLATION.get(sourceCategory);
    if (isolated && isolated.has(targetCategory)) {
      violations.push({
        rule: 'downward-only-deps',
        severity: 'error',
        message: `Sibling dependency: ${sourceCategory} ("${sourceNode.label}") imports ${targetCategory} ("${targetNode.label}")`,
        file: edge.source,
        line: edge.line,
        suggestion: `${sourceCategory} and ${targetCategory} must be independent siblings. Both may depend on the controller hook, but not on each other.`,
      });
    }
  }

  return violations;
}

function checkNoReactInMethods(
  edges: DependencyEdge[],
  nodes: Map<string, DependencyNode>
): Violation[] {
  const violations: Violation[] = [];
  const reactPackages = new Set(['react', 'react-dom', 'react/jsx-runtime']);

  for (const edge of edges) {
    const sourceNode = nodes.get(edge.source);
    const targetNode = nodes.get(edge.target);

    if (!sourceNode || !targetNode) continue;

    const sourceCategory = sourceNode.category as string;

    // Methods and schema layers should be React-free
    if (sourceCategory !== 'method' && sourceCategory !== 'schema') continue;

    if (targetNode.type === 'external' && reactPackages.has(targetNode.label)) {
      violations.push({
        rule: 'no-react-in-methods',
        severity: 'error',
        message: `React import in ${sourceCategory} layer: "${sourceNode.label}" imports "${targetNode.label}"`,
        file: edge.source,
        line: edge.line,
        suggestion: `The ${sourceCategory} layer must be pure (no React). Move React-dependent code to a hook or component.`,
      });
    }
  }

  return violations;
}

function checkBarrelExports(domainsPath: string): Violation[] {
  const violations: Violation[] = [];

  if (!fs.existsSync(domainsPath)) return violations;

  try {
    const domains = fs
      .readdirSync(domainsPath, { withFileTypes: true })
      .filter(e => e.isDirectory());

    for (const domain of domains) {
      const domainDir = path.join(domainsPath, domain.name);
      const indexPath = path.join(domainDir, 'index.tsx');
      const indexTsPath = path.join(domainDir, 'index.ts');

      if (!fs.existsSync(indexPath) && !fs.existsSync(indexTsPath)) {
        violations.push({
          rule: 'barrel-export',
          severity: 'warning',
          message: `Domain "${domain.name}" is missing a barrel index file (index.tsx)`,
          file: domainDir,
          suggestion: `Create an index.tsx that re-exports the domain's public API. Run: rbor domain ${domain.name} (if new) or manually create the file.`,
        });
      }
    }
  } catch {}

  return violations;
}

function checkCircularDependencies(circularDeps: string[][]): Violation[] {
  return circularDeps.map(cycle => ({
    rule: 'no-circular-deps',
    severity: 'warning' as Severity,
    message: `Circular dependency: ${cycle.join(' -> ')}`,
    suggestion: `Break the cycle by extracting shared logic into a lower-level module.`,
  }));
}

export function validate(options: ValidateOptions): void {
  const config = loadConfig();
  const projectRoot = findProjectRoot();
  const domainsPath = getDomainsPath(config);
  const domainsRelative = path.relative(projectRoot, domainsPath).replace(/\\/g, '/');

  console.log('🔍 Validating rBOR architecture...');
  console.log(`   Domains path: ${config.domainsPath}/`);
  console.log('');

  if (!fs.existsSync(domainsPath)) {
    console.log('⚠️  No domains folder found. Nothing to validate.');
    return;
  }

  // Build the full dependency graph for the domains folder
  const analysisOptions: AnalysisOptions = {
    entry: domainsPath,
    direction: 'forward',
    maxDepth: 15,
    includeNodeModules: true, // Need this to detect React imports in methods
    includeTypeImports: false, // Type imports don't count as architectural violations
    includeTests: false,
  };

  let violations: Violation[] = [];

  try {
    const graph = buildDependencyGraph(analysisOptions);

    // Index nodes by ID for fast lookup
    const nodeMap = new Map<string, DependencyNode>();
    for (const node of graph.nodes) {
      nodeMap.set(node.id, node);
    }

    // Run all validation rules
    violations = [
      ...checkCrossDomainImports(graph.edges, nodeMap, domainsRelative),
      ...checkDownwardDependencies(graph.edges, nodeMap),
      ...checkNoReactInMethods(graph.edges, nodeMap),
      ...checkBarrelExports(domainsPath),
      ...checkCircularDependencies(graph.metadata.circularDependencies),
    ];
  } catch (error) {
    console.error(
      '❌ Failed to build dependency graph:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }

  // Report results
  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');

  if (violations.length === 0) {
    console.log('✅ No architecture violations found!');
    console.log('');
    console.log('   All rBOR rules pass:');
    console.log('     ✓ No cross-domain imports');
    console.log('     ✓ Dependencies flow downward');
    console.log('     ✓ Methods layer is React-free');
    console.log('     ✓ All domains have barrel exports');
    console.log('     ✓ No circular dependencies');
    return;
  }

  // Print violations grouped by rule
  console.log('═══════════════════════════════════════════════════════════');

  for (const v of violations) {
    const icon = v.severity === 'error' ? '❌' : '⚠️';
    console.log(`${icon} [${v.rule}] ${v.message}`);
    if (v.file) {
      console.log(`   File: ${v.file}${v.line ? `:${v.line}` : ''}`);
    }
    if (v.suggestion) {
      console.log(`   Fix:  ${v.suggestion}`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   ${errors.length} error(s), ${warnings.length} warning(s)`);
  console.log('');

  if (errors.length > 0 || (options.strict && warnings.length > 0)) {
    process.exit(1);
  }
}

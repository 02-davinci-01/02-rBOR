import type {
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  DependencySummary,
  OutputFormat,
  InternalFileCategory,
  ExternalPackageCategory,
} from '../types/dependency-graph';

export function formatAsJson(graph: DependencyGraph, pretty: boolean = true): string {
  return JSON.stringify(graph, null, pretty ? 2 : 0);
}

export function formatAsSummary(graph: DependencyGraph, targetFile?: string): string {
  const lines: string[] = [];

  // Find the entry/target file
  const entryPoints = graph.metadata.entryPoints;
  const primaryEntry = entryPoints[0] || 'Unknown';
  const entryNode =
    graph.nodes.find(n => n.isEntry) || graph.nodes.find(n => n.path.includes(primaryEntry));

  // Header
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`  FILE SUMMARY: ${entryNode?.label || primaryEntry}`);
  lines.push(`  Path: ${entryNode?.path || primaryEntry}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  if (!entryNode) {
    lines.push('  ⚠️  Could not find entry file in graph');
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines.join('\n');
  }

  // Get outgoing edges (what this file imports)
  const outgoingEdges = graph.edges.filter(e => e.source === entryNode.id);
  const importedNodes = outgoingEdges
    .map(e => graph.nodes.find(n => n.id === e.target))
    .filter((n): n is DependencyNode => n !== undefined);

  // Get incoming edges (what imports this file)
  const incomingEdges = graph.edges.filter(e => e.target === entryNode.id);
  const importerNodes = incomingEdges
    .map(e => graph.nodes.find(n => n.id === e.source))
    .filter((n): n is DependencyNode => n !== undefined);

  // IMPORTS section (what this file depends on)
  lines.push('📥 IMPORTS (what this file depends on)');
  lines.push('───────────────────────────────────────────────────────────────');

  const internalImports = importedNodes.filter(n => n.type === 'internal');
  const externalImports = importedNodes.filter(n => n.type === 'external');

  if (internalImports.length > 0) {
    lines.push(...formatAsFileTree(internalImports, '  '));
  }

  if (externalImports.length > 0) {
    lines.push('');
    lines.push('  📦 PACKAGES');
    const externalByCategory = groupNodesByCategory(externalImports, 'external');
    for (const [category, nodes] of Object.entries(externalByCategory)) {
      if (nodes.length === 0) continue;
      lines.push(`    ${getPackageEmoji(category)} ${category} (${nodes.length})`);
      for (const node of nodes) {
        lines.push(`      └─ ${node.label}`);
      }
    }
  }

  if (importedNodes.length === 0) {
    lines.push('  (no imports)');
  }
  lines.push('');

  // IMPORTED BY section (what depends on this file)
  lines.push('📤 IMPORTED BY (what depends on this file)');
  lines.push('───────────────────────────────────────────────────────────────');

  const internalImporters = importerNodes.filter(n => n.type === 'internal');

  if (internalImporters.length > 0) {
    lines.push(...formatAsFileTree(internalImporters, '  '));
  } else {
    lines.push('  (not imported by any analyzed file)');
  }
  lines.push('');

  // Dynamic imports
  const dynamicOutgoing = outgoingEdges.filter(e => e.importType === 'dynamic');
  const dynamicIncoming = incomingEdges.filter(e => e.importType === 'dynamic');

  if (dynamicOutgoing.length > 0 || dynamicIncoming.length > 0) {
    lines.push('⚡ DYNAMIC IMPORTS');
    lines.push('───────────────────────────────────────────────────────────────');
    for (const edge of dynamicOutgoing) {
      const target = graph.nodes.find(n => n.id === edge.target);
      lines.push(`  └─ imports → ${target?.path || edge.target}`);
    }
    for (const edge of dynamicIncoming) {
      const source = graph.nodes.find(n => n.id === edge.source);
      lines.push(`  └─ imported by ← ${source?.path || edge.source}`);
    }
    lines.push('');
  }

  // Circular dependencies involving this file
  const circularInvolvingEntry = graph.metadata.circularDependencies.filter(cycle =>
    cycle.includes(entryNode.id)
  );

  lines.push('🔄 CIRCULAR DEPENDENCIES');
  lines.push('───────────────────────────────────────────────────────────────');
  if (circularInvolvingEntry.length > 0) {
    for (const cycle of circularInvolvingEntry) {
      lines.push(`  ⚠️  ${cycle.join(' → ')}`);
    }
  } else {
    lines.push('  (none)');
  }
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Format nodes as a folder-structured file tree
 * Groups files by directory and displays as ASCII tree
 */
function formatAsFileTree(nodes: DependencyNode[], indent: string = ''): string[] {
  const lines: string[] = [];

  // Build folder structure
  interface FolderNode {
    files: DependencyNode[];
    folders: Map<string, FolderNode>;
  }

  const root: FolderNode = { files: [], folders: new Map() };

  for (const node of nodes) {
    const relativePath = node.path.replace(/\\/g, '/');
    const parts = relativePath.split('/');
    const fileName = parts.pop() || node.label;

    // Navigate to the correct folder
    let current = root;
    for (const part of parts) {
      if (!current.folders.has(part)) {
        current.folders.set(part, { files: [], folders: new Map() });
      }
      current = current.folders.get(part)!;
    }

    current.files.push({ ...node, label: fileName });
  }

  // Render the tree
  function renderFolder(folder: FolderNode, prefix: string, isRoot: boolean = false): void {
    const folderNames = [...folder.folders.keys()].sort();
    const files = [...folder.files].sort((a, b) => a.label.localeCompare(b.label));
    const totalItems = folderNames.length + files.length;
    let itemIndex = 0;

    // Render subfolders
    for (const folderName of folderNames) {
      itemIndex++;
      const isLast = itemIndex === totalItems;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = prefix + (isLast ? '    ' : '│   ');

      lines.push(`${prefix}${connector}📁 ${folderName}/`);
      renderFolder(folder.folders.get(folderName)!, childPrefix);
    }

    // Render files
    for (const file of files) {
      itemIndex++;
      const isLast = itemIndex === totalItems;
      const connector = isLast ? '└── ' : '├── ';
      const icon = getCategoryEmoji(file.category as string);

      // Show full path for VS Code to auto-link
      lines.push(`${prefix}${connector}${icon} ${file.path}`);
    }
  }

  // Start rendering from root's children (skip empty root)
  const rootFolders = [...root.folders.keys()];
  const rootFiles = root.files;

  if (rootFolders.length === 1 && rootFiles.length === 0) {
    // Single root folder - skip one level
    const singleFolder = rootFolders[0];
    lines.push(`${indent}📁 ${singleFolder}/`);
    renderFolder(root.folders.get(singleFolder)!, indent);
  } else {
    renderFolder(root, indent, true);
  }

  return lines;
}

export function generateFileSummary(graph: DependencyGraph, filePath: string): DependencySummary {
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Find the node
  const node = graph.nodes.find(
    n => n.path.replace(/\\/g, '/').endsWith(normalizedPath) || n.id === normalizedPath
  );

  if (!node) {
    return {
      file: filePath,
      direction: graph.metadata.direction,
      internal: {} as Record<InternalFileCategory, string[]>,
      external: {} as Record<ExternalPackageCategory, string[]>,
      dynamic: [],
      circular: [],
    };
  }

  // Get edges related to this file
  const outgoingEdges = graph.edges.filter(e => e.source === node.id);
  const incomingEdges = graph.edges.filter(e => e.target === node.id);

  const relevantEdges = graph.metadata.direction === 'forward' ? outgoingEdges : incomingEdges;

  // Group dependencies
  const internal: Record<string, string[]> = {};
  const external: Record<string, string[]> = {};
  const dynamic: string[] = [];

  for (const edge of relevantEdges) {
    const targetId = graph.metadata.direction === 'forward' ? edge.target : edge.source;
    const targetNode = graph.nodes.find(n => n.id === targetId);

    if (!targetNode) continue;

    if (edge.importType === 'dynamic') {
      dynamic.push(targetId);
      continue;
    }

    if (targetNode.type === 'internal') {
      const category = targetNode.category as string;
      if (!internal[category]) internal[category] = [];
      internal[category].push(targetId);
    } else if (targetNode.type === 'external') {
      const category = targetNode.category as string;
      if (!external[category]) external[category] = [];
      external[category].push(targetNode.label);
    }
  }

  // Find circular dependencies involving this file
  const circular = graph.metadata.circularDependencies.filter(cycle => cycle.includes(node.id));

  return {
    file: filePath,
    direction: graph.metadata.direction,
    internal: internal as Record<InternalFileCategory, string[]>,
    external: external as Record<ExternalPackageCategory, string[]>,
    dynamic,
    circular,
  };
}

export function formatAsTree(graph: DependencyGraph, maxDepth: number = 3): string {
  const lines: string[] = [];
  const visited = new Set<string>();
  const isReverse = graph.metadata.direction === 'reverse';

  function printNode(nodeId: string, depth: number, prefix: string, isLast: boolean): void {
    if (depth > maxDepth) return;

    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const connector = isLast ? '└── ' : '├── ';
    const icon = getNodeIcon(node);

    lines.push(`${prefix}${connector}${icon} ${node.id}`);

    if (visited.has(nodeId)) {
      lines.push(`${prefix}${isLast ? '    ' : '│   '}    (circular)`);
      return;
    }
    visited.add(nodeId);

    // Get children based on direction
    const children = isReverse
      ? graph.edges.filter(e => e.target === nodeId).map(e => e.source)
      : graph.edges.filter(e => e.source === nodeId).map(e => e.target);

    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    children.forEach((child, index) => {
      printNode(child, depth + 1, childPrefix, index === children.length - 1);
    });
  }

  // Build adjacency list for BFS
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (isReverse) {
      // For reverse: edge.target is the file, edge.source is who imports it
      if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
      adjacency.get(edge.target)!.push(edge.source);
    } else {
      // For forward: edge.source imports edge.target
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    }
  }

  // Start from the actual entry points the user passed
  const startIds = graph.metadata.entryPoints.map(e => {
    const relative = require('path').relative(process.cwd(), e);
    return relative.replace(/\\/g, '/');
  });

  // Dedupe in case multiple entry points resolve to the same id
  const uniqueStartIds = [...new Set(startIds)];

  for (const startId of uniqueStartIds) {
    const node = graph.nodes.find(n => n.id === startId);
    if (!node) continue;

    lines.push(`📦 ${node.path}`);

    const children = adjacency.get(startId) || [];
    children.forEach((child, index) => {
      printNode(child, 1, '', index === children.length - 1);
    });

    lines.push('');
    visited.clear();
  }

  return lines.join('\n');
}

export function formatAsDot(graph: DependencyGraph): string {
  const lines: string[] = [];
  const isReverse = graph.metadata.direction === 'reverse';

  lines.push('digraph DependencyGraph {');
  lines.push('  rankdir=LR;');
  lines.push(
    '  node [shape=box, style="filled,rounded", fontname="Segoe UI", fontsize=12, margin="0.2,0.15"];'
  );
  lines.push('  edge [fontname="Segoe UI", fontsize=10];');
  lines.push('');

  const colors: Record<string, string> = {
    internal: '#4FC3F7', // Soft Blue
    external: '#81C784', // Muted Green
    dynamic: '#FFD54F', // Amber
    builtin: '#90A4AE', // Blue Grey
    entry: '#BA68C8', // Purple
  };

  // Collect nodes involved in circular dependencies
  const circularNodeIds = new Set<string>();
  for (const cycle of graph.metadata.circularDependencies) {
    for (const nodeId of cycle) {
      const normalized = nodeId.replace(/\\/g, '/');
      circularNodeIds.add(normalized);
    }
  }

  lines.push('  // Nodes');
  for (const node of graph.nodes) {
    const isCircularNode = circularNodeIds.has(node.id);
    const color = isCircularNode ? '#FFCDD2' : node.isEntry ? colors.entry : colors[node.type];
    const label = node.id.replace(/"/g, '\\"');
    const border = isCircularNode ? ', color="#E57373", penwidth=2' : '';
    lines.push(`  "${node.id}" [label="${label}", fillcolor="${color}"${border}];`);
  }
  lines.push('');

  lines.push('  // Edges');
  for (const edge of graph.edges) {
    const style = edge.importType === 'dynamic' ? 'dashed' : 'solid';
    const color = edge.isCircular ? '#E57373' : '#666666';
    const circularLabel = edge.isCircular ? ', label="⚠ circular", fontcolor="#E57373"' : '';

    if (isReverse) {
      lines.push(
        `  "${edge.target}" -> "${edge.source}" [style=${style}, color="${color}"${circularLabel}];`
      );
    } else {
      lines.push(
        `  "${edge.source}" -> "${edge.target}" [style=${style}, color="${color}"${circularLabel}];`
      );
    }
  }

  // Add legend if circular dependencies exist
  if (graph.metadata.circularDependencies.length > 0) {
    lines.push('');
    lines.push('  // Legend');
    lines.push('  subgraph cluster_legend {');
    lines.push('    label="⚠ Circular Dependencies Detected";');
    lines.push('    style=dashed; color="#E57373"; fontcolor="#E57373"; fontname="Segoe UI";');
    lines.push('    node [shape=plaintext, fillcolor=transparent, style=""];');
    const count = graph.metadata.circularDependencies.length;
    lines.push(
      `    legend_text [label="${count} circular dependency cycle${count > 1 ? 's' : ''} found"];`
    );
    lines.push('  }');
  }

  lines.push('}');

  return lines.join('\n');
}

function groupNodesByCategory(
  nodes: DependencyNode[],
  type: 'internal' | 'external'
): Record<string, DependencyNode[]> {
  const grouped: Record<string, DependencyNode[]> = {};

  for (const node of nodes) {
    const category = node.category as string;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(node);
  }

  return grouped;
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    page: '📄',
    component: '🧩',
    hook: '🪝',
    service: '⚙️',
    util: '🔧',
    config: '⚙️',
    type: '📝',
    schema: '📋',
    method: '🔨',
    constant: '📌',
    test: '🧪',
    unknown: '❓',
  };
  return emojis[category] || '📁';
}

function getPackageEmoji(category: string): string {
  const emojis: Record<string, string> = {
    framework: '🏗️',
    state: '🗃️',
    networking: '🌐',
    ui: '🎨',
    utility: '🔧',
    testing: '🧪',
    build: '📦',
    other: '📚',
  };
  return emojis[category] || '📦';
}

function getNodeIcon(node: DependencyNode): string {
  if (node.type === 'external') return '📦';
  if (node.type === 'builtin') return '🔌';
  if (node.type === 'dynamic') return '⚡';
  return getCategoryEmoji(node.category as string);
}

export function formatGraph(
  graph: DependencyGraph,
  format: OutputFormat,
  options?: { pretty?: boolean; maxDepth?: number }
): string {
  switch (format) {
    case 'json':
      return formatAsJson(graph, options?.pretty ?? true);
    case 'summary':
      return formatAsSummary(graph);
    case 'tree':
      return formatAsTree(graph, options?.maxDepth ?? 3);
    case 'dot':
      return formatAsDot(graph);
    case 'svg':
      return formatAsDot(graph); // SVG rendering handled separately
    default:
      return formatAsSummary(graph);
  }
}

export async function formatAsSvg(graph: DependencyGraph): Promise<string> {
  const { instance } = await import('@viz-js/viz');
  const viz = await instance();
  const dotString = formatAsDot(graph);
  return viz.renderString(dotString, { format: 'svg', engine: 'dot' });
}

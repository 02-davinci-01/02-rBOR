import * as fs from 'fs';
import * as path from 'path';
import { buildDependencyGraph, formatGraph, formatAsSvg } from '../analyzers';
import type { AnalysisOptions, OutputFormat, GraphDirection } from '../types/dependency-graph';

export interface AnalyzeDepsOptions {
  direction: GraphDirection;
  format: OutputFormat;
  output?: string;
  depth?: number;
  includeExternal?: boolean;
  includeTests?: boolean;
  includeTypes?: boolean;
  aliases?: string;
}

function parseAliases(aliasString?: string): Record<string, string> {
  if (!aliasString) return {};

  const aliases: Record<string, string> = {};
  const pairs = aliasString.split(',');

  for (const pair of pairs) {
    const [alias, target] = pair.split('=');
    if (alias && target) {
      aliases[alias.trim()] = target.trim();
    }
  }

  return aliases;
}

function detectAliases(): Record<string, string> {
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(content);
    const paths = tsconfig.compilerOptions?.paths || {};
    const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';

    const aliases: Record<string, string> = {};

    for (const [alias, targets] of Object.entries(paths)) {
      if (Array.isArray(targets) && targets.length > 0) {
        const cleanAlias = alias.replace(/\/\*$/, '/');
        const cleanTarget = (targets[0] as string).replace(/\/\*$/, '/');
        aliases[cleanAlias] = path.join(baseUrl, cleanTarget);
      }
    }

    return aliases;
  } catch {
    return {};
  }
}

export async function analyzeDeps(targetPath: string, options: AnalyzeDepsOptions): Promise<void> {
  console.log('🔍 Analyzing dependencies...');
  console.log(`   Target: ${targetPath}`);
  console.log(`   Direction: ${options.direction}`);
  console.log(`   Format: ${options.format}`);
  console.log('');

  const resolvedPath = path.resolve(process.cwd(), targetPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: Path not found: ${resolvedPath}`);
    process.exit(1);
  }

  const effectiveDirection = options.format === 'summary' ? 'both' : options.direction;

  const analysisOptions: AnalysisOptions = {
    entry: resolvedPath,
    direction: effectiveDirection,
    maxDepth: options.depth ?? 10,
    includeNodeModules: options.includeExternal ?? false,
    includeTypeImports: options.includeTypes ?? true,
    includeTests: options.includeTests ?? false,
    aliases: {
      ...detectAliases(),
      ...parseAliases(options.aliases),
    },
  };

  try {
    const startTime = Date.now();
    const graph = buildDependencyGraph(analysisOptions);
    const duration = Date.now() - startTime;

    console.log(`✅ Analysis complete in ${duration}ms`);
    console.log(`   Found ${graph.stats.nodeCount} nodes, ${graph.stats.edgeCount} edges`);
    console.log('');

    let output: string;
    if (options.format === 'svg') {
      output = await formatAsSvg(graph);
    } else {
      output = formatGraph(graph, options.format, {
        pretty: true,
        maxDepth: options.depth ?? 3,
      });
    }

    if (options.output) {
      const outputPath = path.resolve(process.cwd(), options.output);
      fs.writeFileSync(outputPath, output, 'utf-8');
      console.log(`📄 Output written to: ${outputPath}`);
    } else {
      console.log(output);
    }

    if (graph.metadata.circularDependencies.length > 0) {
      console.log('');
      console.log(
        `⚠️  Warning: Found ${graph.metadata.circularDependencies.length} circular dependencies`
      );
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

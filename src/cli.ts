#!/usr/bin/env node
import { Command } from 'commander';
import * as readline from 'readline';
import { generateDomain } from './commands/generate-domain';
import { generateEndpoint } from './commands/generate-endpoint';
import { generateConstant } from './commands/generate-constant';
import { analyzeDeps, type AnalyzeDepsOptions } from './commands/analyze-deps';
import { initProject, type InitOptions } from './commands/init';
import { listDomains } from './commands/list-domains';
import { validate, type ValidateOptions } from './commands/validate';
import { loadConfig, configExists } from './utils/config';

export type HttpClient = 'axios' | 'fetch' | 'ky';

export interface DomainOptions {
  http?: HttpClient;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function interactiveDomain(): Promise<void> {
  console.log('');
  console.log('🚀 rBOR Domain Generator (Interactive Mode)');
  console.log('───────────────────────────────────────────');
  console.log('');

  const name = await prompt('  Domain name (e.g. user-profile): ');
  if (!name) {
    console.error('❌ Domain name is required.');
    process.exit(1);
  }

  console.log('');
  console.log('  HTTP client options:');
  console.log('    1) axios (default)');
  console.log('    2) fetch');
  console.log('    3) ky');
  console.log('');
  const httpChoice = await prompt('  Choose HTTP client [1/2/3]: ');

  const httpMap: Record<string, HttpClient> = { '1': 'axios', '2': 'fetch', '3': 'ky' };
  const httpClient: HttpClient = httpMap[httpChoice] || 'axios';

  console.log('');
  console.log(`  📋 Summary:`);
  console.log(`     Domain:      ${name}`);
  console.log(`     HTTP client: ${httpClient}`);
  console.log('');

  const confirm = await prompt('  Proceed? [Y/n]: ');
  if (confirm.toLowerCase() === 'n') {
    console.log('  Cancelled.');
    process.exit(0);
  }

  console.log('');
  generateDomain(name, { http: httpClient });
}

const program = new Command();

const config = configExists() ? loadConfig() : null;

program
  .name('rbor')
  .description('CLI tool to scaffold rBOR architecture features')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize rBOR configuration (.rborrc.json)')
  .option('--http <client>', 'Default HTTP client (axios, fetch, ky)')
  .option('--domains-path <path>', 'Path to domains folder')
  .option('--infrastructure-path <path>', 'Path to infrastructure folder')
  .option('--force', 'Overwrite existing configuration', false)
  .action((options: InitOptions) => {
    initProject(options);
  });

program
  .command('domain [name]')
  .description('Generate a new domain feature with rBOR structure (interactive if no name given)')
  .option('--http <client>', 'HTTP client to use (axios, fetch, ky)', config?.http ?? 'axios')
  .action(async (name: string | undefined, options: DomainOptions) => {
    if (!name) {
      await interactiveDomain();
    } else {
      generateDomain(name, options);
    }
  });

program
  .command('endpoint <path>')
  .description('Add an endpoint to the current domain (run from inside domains/<domain>/)')
  .action((endpointPath: string) => {
    generateEndpoint(endpointPath);
  });

program
  .command('constant <key=value>')
  .description('Add a constant to the current domain (run from inside domains/<domain>/)')
  .action((input: string) => {
    generateConstant(input);
  });

program
  .command('list')
  .alias('ls')
  .description('List all existing domains with metadata')
  .action(() => {
    listDomains();
  });

program
  .command('validate')
  .alias('lint')
  .description('Validate architecture against rBOR rules')
  .option('--strict', 'Treat warnings as errors', false)
  .action((options: ValidateOptions) => {
    validate(options);
  });

program
  .command('deps <path>')
  .description('Analyze dependencies of a file or directory')
  .option('-d, --direction <dir>', 'Analysis direction (forward, reverse)', 'forward')
  .option('-f, --format <fmt>', 'Output format (json, summary, tree, dot, svg)', 'summary')
  .option('-o, --output <file>', 'Write output to file')
  .option('--depth <n>', 'Maximum depth to traverse', '10')
  .option('--include-external', 'Include external npm packages in traversal', false)
  .option('--include-tests', 'Include test files', false)
  .option('--include-types', 'Include type-only imports', true)
  .option('--aliases <mapping>', 'Path aliases (e.g., "@/=src/")')
  .action((targetPath: string, options: AnalyzeDepsOptions) => {
    analyzeDeps(targetPath, {
      ...options,
      depth: options.depth ? parseInt(String(options.depth), 10) : 10,
    });
  });

program
  .command('davinci')
  .description('Credits')
  .action(() => {
    console.log(
      'rendered to reality by 02-davinci-01. Say hello: https://02-davinci-01.vercel.app'
    );
  });

program.parse(process.argv);

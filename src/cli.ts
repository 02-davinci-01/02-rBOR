#!/usr/bin/env node
import { Command } from 'commander';
import { generateDomain } from './commands/generate-domain';
import { generateEndpoint } from './commands/generate-endpoint';
import { analyzeDeps, type AnalyzeDepsOptions } from './commands/analyze-deps';
import { initProject, type InitOptions } from './commands/init';
import { listDomains } from './commands/list-domains';
import { validate, type ValidateOptions } from './commands/validate';
import { loadConfig, configExists } from './utils/config';

export type HttpClient = 'axios' | 'fetch' | 'ky';

export interface DomainOptions {
  http?: HttpClient;
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
  .command('domain <name>')
  .description('Generate a new domain feature with rBOR structure')
  .option('--http <client>', 'HTTP client to use (axios, fetch, ky)', config?.http ?? 'axios')
  .action((name: string, options: DomainOptions) => {
    generateDomain(name, options);
  });

program
  .command('endpoint <path>')
  .description('Add an endpoint to the current domain (run from inside domains/<domain>/)')
  .action((endpointPath: string) => {
    generateEndpoint(endpointPath);
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
  .option('-f, --format <fmt>', 'Output format (json, summary, tree, dot)', 'summary')
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

program.parse(process.argv);

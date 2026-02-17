import {
  configExists,
  writeConfig,
  DEFAULT_CONFIG,
  findProjectRoot,
  type RborConfig,
} from '../utils/config';
import type { HttpClient } from '../cli';

export interface InitOptions {
  http?: HttpClient;
  domainsPath?: string;
  infrastructurePath?: string;
  force?: boolean;
}

export function initProject(options: InitOptions): void {
  const root = findProjectRoot();
  console.log('🔧 Initializing rBOR configuration...');
  console.log(`   Project root: ${root}`);
  console.log('');

  if (configExists(root) && !options.force) {
    console.log('⚠️  Configuration already exists.');
    console.log('   Use --force to overwrite the existing configuration.');
    return;
  }

  const config: RborConfig = {
    http: options.http ?? DEFAULT_CONFIG.http,
    domainsPath: options.domainsPath ?? DEFAULT_CONFIG.domainsPath,
    infrastructurePath: options.infrastructurePath ?? DEFAULT_CONFIG.infrastructurePath,
    schema: { ...DEFAULT_CONFIG.schema },
  };

  const configPath = writeConfig(config, root);

  console.log('✅ Created .rborrc.json');
  console.log('');
  console.log('   Configuration:');
  console.log(`     HTTP client:          ${config.http}`);
  console.log(`     Domains path:         ${config.domainsPath}`);
  console.log(`     Infrastructure path:  ${config.infrastructurePath}`);
  console.log(`     Schema library:       ${config.schema.library}`);
  console.log('');
  console.log(`   Config file: ${configPath}`);
}

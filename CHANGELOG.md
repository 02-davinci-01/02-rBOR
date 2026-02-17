# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Configuration support via `.rborrc.json` for project-level defaults
- `rbor init` command to initialize project configuration
- `rbor list` command to show all domains with metadata
- `rbor validate` command for architecture linting (enforces rBOR rules)
- Unit tests with vitest (74 tests covering core logic)
- ESLint and Prettier for code quality
- Husky and lint-staged for pre-commit hooks
- GitHub Actions CI/CD workflows
- Comprehensive test suite for naming utilities, import parser, and file categorizer
- Config-aware domain generation (uses defaults from `.rborrc.json`)

### Changed

- Moved axios and ky to peerDependencies (users choose their HTTP client)
- HTTP client defaults now loaded from config file
- Domains path configurable via config file
- Improved package.json with proper npm metadata

### Fixed

- Base service `put` method missing `data` parameter
- Domain service template hardcoding axios imports
- Methods template parameter mismatch across HTTP clients
- HTTP-client-aware templates for domain services

## [0.1.0] - Initial Release

### Added

- `rbor domain <name>` - Generate new domain with rBOR structure
- `rbor endpoint <path>` - Add endpoint to existing domain
- `rbor deps <path>` - Analyze dependency graphs
- Support for axios, fetch, and ky HTTP clients
- TypeScript-first architecture
- Regex-based import parsing for dependency analysis
- File categorization system (component, hook, service, method, etc.)
- Graph output formats: JSON, summary, tree, DOT

# Changelog

Every notable change to the project is recorded in this changelog. The format follows [Keep a Changelog](https://keepachangelog.com/). The version numbers follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Reading view in Obsidian for the files with the extensions `.yaml` and `.yml`.
- Code block `yaml-view` to embed a YAML file in a note.
- Domain model of YAML documents, carrying source ranges.
- Pure projection of the domain model to Markdown, in which a registry of renderers ordered by priority selects the renderer of each node.
- Source tree in four layers: `domain`, `application`, `infrastructure` and `adapters`.
- Development toolchain that builds, type-checks, lints, formats and tests the code (esbuild, tsc, ESLint, Prettier and Vitest, respectively).
- Boundaries between layers, enforced by ESLint.

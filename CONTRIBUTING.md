# Contributing to "ekphrasis"

To contribute to ekphrasis, a contributor performs the tasks below in the order of their first use, from submitting an issue to releasing a version. The configuration files are located in the last section.

## Submitting issues

To request a change to the project, an issue is submitted from the repository page, in three steps:

1. Open the "Issues" tab and click on "New Issue".
2. Select the issue template, and fill it in.
3. Add the relevant labels, the assignees, and the milestone if applicable.

## Developing the code

The development environment is set up once, through the installation and the commit message template. Then, the development loop, the quality checks and the commit message format apply to each change, and the release procedure applies to each version.

### Installation

To set up the development environment, the repository is cloned and its development dependencies are installed, in two steps:

1. Clone the repository into a local directory:

   ```sh
   cd /path/to/local/directory
   git clone git@github.com:esther-poniatowski/ekphrasis.git
   ```

2. Install the Node version specified in the version file `.nvmrc`, then the development dependencies:

   ```sh
   cd ekphrasis
   nvm use
   npm install
   ```

### Commit message template

To start each commit message from the commit template of the repository, the template is set up in two steps:

1. Edit the commit template `.gitmessage`, at the root of the repository, to specify the name and the email address of the committer.

2. Configure `git` to use this file as the commit template:

   ```sh
   git config commit.template .gitmessage
   ```

### Development loop in Obsidian

To test each source change in Obsidian, the plugin is loaded from the repository into a development vault, in four steps:

1. Link the repository into the plugin folder of a development vault. The commands below use the bundled example vault, provided for this purpose:

   ```sh
   mkdir -p examples/vault/.obsidian/plugins
   ln -s "$(pwd)" examples/vault/.obsidian/plugins/ekphrasis
   ```

2. Start the watch build, so that the bundle `main.js` is regenerated at each change:

   ```sh
   npm run dev
   ```

3. Open the example vault `examples/vault` in Obsidian, and enable the plugin.
4. Reload the plugin after each rebuild, either by toggling it off and on, or by installing the "Hot Reload" plugin in the development vault.

### Manual tests in Obsidian

To verify a milestone inside Obsidian, a protocol of the [manual tests](tests/manual/_index.md) runs in a test vault built from versioned files only. The command below builds the vault in `examples/test-vault/`, or resets it before a new run:

```sh
npm run build
npm run test-vault
```

The vault receives fresh copies of the test fixtures and of the scenario records, the settings of the protocols, and links to the plugin bundle. Its folder `protocols` links to the versioned protocols, so the ticks and observations written in Obsidian are recorded in the repository. Obsidian refuses a vault whose path contains a hidden folder, so the repository must not lie inside a folder whose name starts with a dot.

### Quality checks

To verify a change, each quality check runs through one npm command:

| Command | Tool | Purpose |
| ------- | ---- | ------- |
| `npm run format` | Prettier | Format the code |
| `npm run lint` | ESLint | Lint the code, and enforce the boundaries between layers |
| `npm run typecheck` | TypeScript | Check the types in strict mode |
| `npm test` | Vitest | Run the unit tests |
| `npm run check:links` | `scripts/check-links.mjs` | Check that each relative link of the Markdown files reaches its file, heading or block |
| `npm run build` | esbuild | Build the production bundle |

### Commit message format

A commit message must follow seven rules:

- Capitalize the subject line, and end it without a period.
- Limit the subject line to 50 characters.
- Write the subject line in the imperative mood.
- Separate the subject line from the body with a blank line.
- Wrap the body at 72 characters per line.
- Explain in the body what changed and why, not how.
- Reference issues or other commits with [GitHub keywords](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/using-keywords-in-issues-and-pull-requests).

### Releasing

To release a version, its number is set by the command `npm version <patch|minor|major>`. This command updates the package manifest `package.json`, the plugin manifest `manifest.json` and the version map `versions.json` consistently, through the [version-bump script](scripts/version-bump.mjs). Then, the version in the citation metadata `CITATION.cff` must be updated manually.

## Configuration files

One rule locates every configuration file: a file required at a fixed location stays at the repository root, and every other setting is grouped in the folder `config/`.

### Files at the repository root

Each file at the repository root is required there for the reason stated beside it:

| File | Reason for its location |
| ---- | ----------------------- |
| `package.json` | Manifest of the npm project |
| `tsconfig.json` | Resolved from the root by editors, `tsc` and type-aware ESLint rules |
| `manifest.json`, `versions.json` | Required by the Obsidian plugin registry |
| `styles.css` | Loaded by Obsidian from the plugin folder |

### Tool settings

The folder `config/tools/` holds the settings of the development tools:

| File | Tool | Purpose |
| ---- | ---- | ------- |
| `esbuild.config.mjs` | esbuild | Bundle the plugin into `main.js` |
| `eslint.config.mjs` | ESLint | Declare the linting rules and the architectural boundaries |
| `prettier.json` | Prettier | Declare the formatting rules |
| `prettier.ignore` | Prettier | Exclude the manual test records and protocols from formatting |
| `vitest.config.ts` | Vitest | Configure test discovery and coverage |

### Spell-checking dictionaries

The folder `config/dictionaries/` holds the word lists of the spell checker:

| File | Contents |
| ---- | -------- |
| `project.txt` | Terms specific to the project |
| `typescript.txt` | Terms of the TypeScript language |
| `tools.txt` | Names of the development tools |

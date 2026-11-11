---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Setup diagnostic
---
# Setup diagnostic

The setup diagnostic checks each dependency of the route from the schema registry to an issue displayed at its field. For each broken dependency, the diagnostic names the action that repairs it. The route links nine dependencies:

1. the schema registry;
2. the schema resources;
3. the form of a record;
4. the authored record;
5. the Python interpreter;
6. the checker command;
7. the package imported by that command;
8. the machine-readable report of the command;
9. the issue displayed at its field.

The diagnostic only reads files, settings and environments: it writes none of them.

## Command

The command *Diagnose setup* opens the report of the diagnostic. The button *Diagnose setup*, at the top of the settings of Ekphrasis, opens the same report. The diagnostic examines the record of the active view of Ekphrasis, or else the record last displayed by the outline. Without such a record, the checks of the record and of the measured run report `unavailable`. The report offers the buttons *Run again* and *Copy report*. The copied report is plain text, ready for a message or an issue.

## Results

Each check yields one of four statuses:

| Status | Meaning |
| --- | --- |
| `pass` | The dependency works. |
| `warning` | The dependency works, but with a risk or a limit that the check names. |
| `fail` | The dependency is broken. |
| `unavailable` | The check could not run: the platform lacks it, no record is open, or a dependency checked before it failed. |

A check that does not pass states four elements: ^check-elements

- the dependency checked;
- the observed value or failure;
- the capability affected;
- the next action of the researcher.

Paths, command lines and error output form the technical details of a check. These details stay folded below the check, and the copied report includes them.

The checks are grouped by the capability that their failure removes, in this order:

1. *Blocks schema-derived forms*: the registry, the schemas and the form of the opened record.
2. *Blocks saving authored records*: the origin of the opened file, its place among the indexed files, and its write permission.
3. *Blocks configured custom checks*: the registrations, the interpreter, the imports, the package data, and the measured run.
4. *Reduces functionality; editing stays available*: the defects of composition, the unreported changes of generated schemas, and the instance checkers of the opened record.

Within a group, the checks that fail come first. When the checks of one group stop on an unexpected error, that group reports one failed check holding the error. The other groups still run.

## Schema checks

The schema checks read every file through the file boundary of the forms. Therefore, a file that the diagnostic cannot read is also a file that the forms cannot read. The checks examine eight dependencies:

- the setting *Schema registry*: present when Ekphrasis serves the `_schema` owner of a file;
- the registry file: present, valid YAML, and structured as the [binding sources](instance-files.md#^binding-sources) define;
- the version of the registry: 1 or 2;
- the schema of each contract: present, loadable with the closure of its references, and declaring the contract as the constant of its property `_schema`;
- the file of each resource: present, and declaring as its root `$id` the URI mapped to it;
- each absolute `$ref` written in a file of the registry: resolved through the key `resources` or a loaded `$id`, as the [absolute references](schemas.md#^absolute-references) require;
- the guarded schema closure: each hidden file is named by the registry or reached through a relative `$ref`;
- the [composition](schemas.md#^composition) of each loaded contract: free of conflicts, and compiled by the validator.

Obsidian omits some generated schema files from its indexed files. The forms read such a file only when the registry names it or an admitted schema reaches it through a relative `$ref`. The diagnostic reports a mapped file that the guarded reader refuses.

Obsidian also reports no change of a file that it does not index. Therefore, the diagnostic compares the modification time of each unindexed mapped schema with the load of the plugin. A schema changed after the load requires a restart of Obsidian.

## Record checks

The record checks follow the save of a form up to the file that a save would write, without writing it. The checks examine four properties of the opened record:

- its form state, as its view last built it: bound, unbound, an invalid binding, a YAML error, or a schema error;
- its origin: a schema, the registry, and a view whose schema marks it `readOnly` are generated, and Ekphrasis never writes them;
- for an authored record, its place among the files indexed by Obsidian, as a save requires;
- for an authored record, the permission of the operating system to write the file.

A file with a well-formed `_schema` remains in the source view without an error when no registry identifier names its format `<owner>:<type>`. By contrast, the form check fails when the registry holds another major of that format, or when the identifier does not have the required form.

The desktop app of Obsidian writes a saved file in place. Therefore, the write permission of the file decides whether a save succeeds, and the diagnostic asks the operating system for that permission without creating a probe file. The mobile app exposes no permission to plugins. Therefore, on mobile, the check reports `unavailable`, a status distinct from a refused permission.

## Checker checks

On the desktop app, the checker checks follow the route of the configured [custom checkers](custom-checkers.md):

- the registrations: complete, uniquely named, and, for the built-in findings route, holding a list `command` of text arguments;
- the interpreter: an absolute path naming an executable file;
- the schema patterns: each pattern compiles, and each instance checker selects at least one contract identifier of the registry;
- the start of the interpreter: answered with the Python version;
- the imports: the module of each registered function, and the module that a command runs by `-m`, located without running that module;
- the data files of each imported package: each file opened and read for one byte;
- the measured run: one run of each instance checker that selects the opened record.

The run of a findings route executes the configured command once, through the Python code of a validation. The standard output of the command must be a log of the Static Analysis Results Interchange Format (SARIF) 2.1.0. Each result of that log must carry a message text and the artifact location of its file. A failed run reports the copyable command line and the end of the error output. The run of a registered function makes one call, whose result must be a list of issues.

The interpreter of the diagnostic runs with the option `-B`, so that Python writes no bytecode cache. The configured command runs once, as in one validation, so its side effects are those of the tool alone.

## Duration

The diagnostic runs each instance checker once, and never repeats the run to estimate a duration. Then, the diagnostic compares the measured duration with the setting *Checker timeout*. The process of the checkers answers one call at a time, and the timeout of a call runs from its request. Therefore, a validation started during another call waits for that call, and its call lasts about twice the measured duration. The comparison of the measured duration with the timeout yields three statuses: ^timeout-rule

- `fail` when one call reaches the timeout;
- `warning` when a call queued behind another reaches the timeout;
- `pass` otherwise.

The recommended timeout is twice the measured duration, rounded up to a step of the setting. The diagnostic recommends this value and leaves the setting unchanged.

A call that exceeds the timeout stops the checker process together with the command of a findings route and the descendants of that command, as the [stop of the process tree](custom-checkers.md#^process-tree-stop) states. Therefore, the diagnostic reports no check on the cancellation of a command.

## Platforms

On the desktop app, every check runs. On the mobile app, Python checkers cannot run, so the checker checks reduce to one check of status `unavailable`. The check of the platform states that forms and built-in checks remain available. The schema and record checks run on both apps.

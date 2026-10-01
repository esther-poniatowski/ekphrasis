# Spikes inside Obsidian

Four premises of ekphrasis can only be tested inside a running Obsidian, since each depends on the host application. Each premise is tested by one spike of the disposable plugin `ekphrasis-spikes`, and each verdict is recorded in the decision record that states the premise. The folder `spikes/` is deleted once the four verdicts are recorded.

| Premise | Decision record | Commands of the spike |
| --- | --- | --- |
| Obsidian resolves a conflict when two plugins register `.yaml` | [Plain YAML instances](../docs/adr/plain-yaml-instances.md#^extension-conflict) | *Extension conflict: report the registration of .yaml and .yml* |
| Ajv compiles schemas with keywords prefixed `x-` inside Obsidian | [Schema dialect](../docs/adr/json-schema-dialect.md) | *Ajv: compile the bundled glossary schema…*, *Ajv: compile the active schema file…* |
| One hundred rendered fields stay responsive | [Field rendering](../docs/adr/field-rendering.md) | *Rendering: open the view of 100 Markdown values and 100 formulas* |
| A desktop plugin starts and stops a Python process | [Python checkers](../docs/adr/python-checkers.md) | *Python: start a process and exchange one message*, *Python: stop the process* |

## Installation

To install the spike plugin, a test vault distinct from every working vault is required, in four steps:

1. Build the plugin inside the ekphrasis repository, which holds `package.json`. The command fails with `ENOENT` in any other folder, the test vault included:

   ```sh
   cd /path/to/ekphrasis
   npm run build:spikes
   ```

2. Link the folder `spikes/` of the repository into the plugin folder of the test vault. Both paths are absolute, so the commands run from any folder:

   ```sh
   mkdir -p /path/to/test-vault/.obsidian/plugins
   ln -s /path/to/ekphrasis/spikes /path/to/test-vault/.obsidian/plugins/ekphrasis-spikes
   ```

3. Open the test vault, open the developer console (`Cmd+Option+I`), and enable *Ekphrasis spikes* under *Settings → Community plugins*.
4. Run each command below from the command palette. Each command opens a report with a *Copy* button, and the copied report is pasted back into the session.

## Extension conflict

The verdict depends on the order in which the two plugins load, so the spike runs twice:

1. Install *YAML Editor* from the community plugins, and enable it.
2. Enable *Ekphrasis spikes*. Copy every error that the console shows during the load.
3. Run *Extension conflict: report the registration of .yaml and .yml*, and copy the report.
4. Open a file `.yaml` and a file `.yml` of the vault, and note which view opens each file. The view of the spike shows the line *Opened by the view of ekphrasis-spikes*.
5. Disable both plugins, then enable *Ekphrasis spikes* first and *YAML Editor* second, and repeat steps 2 to 4.

The report reads a private registry of Obsidian, so the view opened in step 4 decides the verdict.

## Ajv inside Obsidian

1. Run *Ajv: compile the bundled glossary schema and validate its instance*. Ajv must compile the schema with `strictSchema` disabled, and must report the placeholder `{{CATEGORY}}` as invalid, since the synthetic instance leaves that field unfilled.
2. Copy the folder of geonexus schemas (`utils/schemas/`) into the test vault, open one schema of that folder, and run *Ajv: compile the active schema file with the schemas of its folder*. When the extension conflict leaves the file closed, select it in the file explorer before running the command.

A compilation that fails inside Obsidian but succeeds in Node points to the security policy of the host, since Ajv generates code with `new Function`.

## Rendering time

1. Run *Rendering: open the view of 100 Markdown values and 100 formulas*. MathJax loads during the first run only.
2. Click the button *Run again* in the header of the view at least twice, so that the report holds runs with MathJax already loaded.
The report states five timestamps per run, and the long tasks of the main thread. A long task delays every input event that arrives during it, so the longest task bounds the freeze perceived while a form renders. The time to every Markdown value rendered decides whether the form must render first the fields in the visible area.

## Python process

1. Run *Python: start a process and exchange one message*, enter the interpreter, and start. A command name such as `python3` is resolved against the search path of the Obsidian application, which may differ from the search path of a terminal. Run the spike once with `python3`, and once with the absolute path of a conda environment.
2. Copy the report, which states the process id and the exit log.
3. Close the test vault, or quit Obsidian. Then check in a terminal that the process has stopped, and read the exit log:

   ```sh
   ps -p <process id>
   cat <exit log>
   ```

The exit log names the mechanism that stopped the process. The cause `SIGTERM`, the termination signal, means that the plugin killed the process when it unloaded. The cause `end of input` means that the process detected the closed pipe of a dead parent. A process still listed by `ps` is a negative verdict.

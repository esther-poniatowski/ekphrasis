---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Python checkers
status: proposed
---
# Python checkers

> [!QUESTION] Goal: how does the plugin run the custom checkers written in Python?

Obsidian runs plugins in JavaScript, whereas the projects served implement their checks in Python, with dependencies installed in environments of their own. The [requirement on custom checkers](../requirements.md#^custom-checkers) calls for these functions to run from the form.

## Decision

One persistent Python process per vault runs the custom checkers. The process is started with the interpreter of the settings, and executes a runner script shipped with the plugin. The runner imports the registered modules, and answers each call over its standard streams, one JSON message per line, as the specification of [custom checkers](../features/custom-checkers.md) details.

## Constraints

- **Project environment**: a checker must run with the packages installed in the environment of its project.
- **Latency**: the checks must not delay the edits of the form.
- **Safety**: only functions registered by the user may run.
- **Form without Python**: the form view must work where no Python interpreter is available.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Python compiled to WebAssembly, such as Pyodide, run inside the plugin | Runs on mobile, with no interpreter to configure | The packages of the project environment must be installed again inside the runtime, and packages with compiled extensions are available only when ported |
| One process per call | Each call runs in isolation | Each call pays the start of the interpreter and the imports of the modules |
| One persistent process, with messages over its standard streams | The imports are paid once, and each call is answered within the running process | Runs on desktop only, and a modified module takes effect after a restart of the process |
| Local server started by the user | Serves checkers written in any language | One more service must be started and secured |
| Checkers written in JavaScript or TypeScript, run inside the plugin | Runs on mobile and at each commit, with no interpreter to configure | Every rule that a project already checks in Python must be written again, and the two implementations can diverge; loading checker code from the vault also executes code, so registration is still required |

## Consequences

- Custom checkers run on desktop only. The manifest keeps the plugin available on mobile, where the form view works and the custom checkers are skipped.
- Every value exchanged with a checker must be representable in JSON.
- A command restarts the process after a module changes, and a timeout bounds each call.
- A rule family shared by several projects, such as the resolution of references across files, should become a predefined checker declared in the schema. The Python process then serves the rules specific to one project.

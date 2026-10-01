---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Python checkers
status: accepted
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

## Verification

The decision holds on the desktop application, as the spike on the Python process confirmed on 2026-10-01 in a test vault. The spike started an interpreter through `child_process`, with the runner script passed as a string to the option `-c`. Then, the plugin and the process exchanged JSON messages, one per line. Four results bear on the decision:

- The interpreter of a conda environment answered its first message 29 to 70 ms after the start, and each later message in at most 0.2 ms.
- Closing the vault and quitting Obsidian both stopped the process. In both cases, the process exited because its standard input reached its end, and the plugin never sent its termination signal.
- The command `python3` resolved to the interpreter of the Apple command-line tools, version 3.9.6, whereas a terminal of the same computer resolves it to another interpreter. An application started from the Dock does not inherit the search path of the shell.
- A path naming no interpreter failed at the start with the error `ENOENT`, which reports a missing file.

Three constraints follow for the milestone *Custom checkers*:

- The runner script must exit when its standard input ends, since ekphrasis cannot rely on its own cleanup to stop the process when the vault closes.
- The settings must resolve the interpreter to an absolute path. A conda environment named in the settings must likewise be resolved to the path of its interpreter, since the command `conda` may be absent from the search path of the application.
- A failed start must be reported to the user with the interpreter path, so that an `ENOENT` reads as a wrong path in the settings.

The bundle can carry the runner script as a string. Therefore, the risk on packaging recorded in the implementation plan is resolved.

---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Generated views
---
# Generated views

The primary-view route enables a researcher to open the generated YAML view for an explicit completion target. For this route, the project defines the target vocabulary and the target-to-view rule. The project also generates the view content. Then, Ekphrasis passes the target to the configured command. Finally, Ekphrasis opens the returned file. ^primary-view-route

## Configuration

The setting *Primary-view command* holds command arguments in a JSON array. When the command runs, two placeholders receive values:

- `{vault}` receives the absolute path of the vault root;
- `{target}` receives the completion target entered by the researcher.

The command must print one JSON object on standard output. The object's `path` field must name an existing `.yml` or `.yaml` file inside the vault. Ekphrasis rejects an invalid result. Ekphrasis also rejects a non-YAML file or a path outside the vault. However, the producer may add other output fields.

## Interaction

The command *Open primary view* asks for the completion target. Ekphrasis substitutes the target and vault path into each configured argument, without a shell. After the producer exits successfully, Ekphrasis opens the reported file in the form view. After a command failure, Ekphrasis keeps the current view unchanged. The failure reason appears in a notice.

The generated YAML file remains the only source of the displayed view. Accordingly, Ekphrasis does not retain the target as view state. Ekphrasis also does not infer a target from authored records or map a target to a filename.

Because the command invokes the configured Python interpreter, the command runs only in the desktop app. By contrast, a generated view already present in the vault remains available on mobile.

---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Custom checkers
---
# Custom checkers

A custom checker implements in Python a rule beyond the predefined checkers, as the [requirement on custom checkers](../requirements.md#^custom-checkers) demands. A project can thereby reuse the Python functions that already check its records, such as a check that every symbol of a formula is declared.

## Registration

A custom checker is a Python function registered under a name in the settings of the plugin. The settings declare two elements for all custom checkers:

- the Python interpreter, given by its path or by the name of a conda environment;
- the checker modules, each given by a file path in the vault or by an importable module name, together with the name under which each function is registered.

A schema invokes a registered checker by its name, under the key `check` of a [rule declaration](validation.md). Only registered functions can run, so a schema received from another source cannot execute code of its own choice.

## Function contract

Each checker function receives the checked value and its context, and returns a list of issues. The function below reports each symbol of a signature left undeclared by the variables of the record:

```python
def declared_symbols(value, *, instance, path, file, **arguments):
    """Report each symbol of the signature not declared by any variable of the record."""
    declared = {variable["symbol"] for variable in instance.get("variables") or []}
    return [f"Undeclared symbol: {symbol}" for symbol in value if symbol not in declared]
```

The parameters carry the following content:

| Parameter | Content |
| --- | --- |
| `value` | Value of the field that declares the rule, as parsed from YAML |
| `instance` | Whole instance, as parsed from YAML |
| `path` | [Field path](field-paths.md) of the field that declares the rule |
| `file` | Absolute path of the instance, so that the checker can read neighbouring files |
| `arguments` | Further keys of the rule declaration |

A returned item takes one of two forms. A string is reported as an issue at the field that declares the rule. A mapping with the keys `message`, `path` and `severity` is reported at its own path, a field path starting from the root of the instance. Therefore, an instance-scope checker can locate each issue at its field. An exception raised by the function is reported as one issue at the declaring field, with the message of the exception.

## Execution

The custom checkers run in one Python process, started with the interpreter of the settings when the first checker is needed. The process imports the registered modules, receives each call as a JSON message, and returns the issues as a JSON message, as the decision on [Python checkers](../adr/python-checkers.md) records. Three constraints follow for the author of a checker:

- the value, the instance and the returned issues must be representable in JSON;
- a modified module takes effect after the command *Restart Python checkers*;
- a call that exceeds the timeout of the settings is reported as an issue at the declaring field.

The custom checkers run after the checks computed within the plugin, once the commits pause, so a slow checker delays no edit. On the mobile application of Obsidian, the custom checkers are skipped, and the form reports that they did not run.

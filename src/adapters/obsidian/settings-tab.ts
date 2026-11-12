/**
 * Settings tab: form behavior, schema binding, and the registered Python checkers.
 */
import { PluginSettingTab, Setting, type App, type Plugin, type TextComponent } from "obsidian";
import {
  COMMIT_DELAY_LIMITS,
  CUSTOM_CHECKER_TIMEOUT_LIMITS,
  type CustomCheckerRegistration,
  type EkphrasisSettings,
} from "../../application";
import type { JsonValue, PathRule } from "../../domain";

/** Owner of the settings, which stores them and applies them to the open views. */
export interface SettingsHost {
  readonly settings: EkphrasisSettings;
  updateSettings(settings: EkphrasisSettings): Promise<void>;
  /** Opens the report of the setup diagnostic, which checks the settings below and changes none. */
  diagnoseSetup(): void;
}

export class EkphrasisSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private readonly host: SettingsHost,
  ) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName("Setup diagnostic")
      .setDesc(
        "Checks the schema registry, the schemas, the opened record and the Python checkers, " +
          "and states what to repair. The diagnostic changes no file and no setting.",
      )
      .addButton((button) =>
        button.setButtonText("Diagnose setup").onClick(() => this.host.diagnoseSetup()),
      );
    new Setting(containerEl)
      .setName("Commit delay")
      .setDesc(
        "Pause of typing, in milliseconds, after which a text field of the form saves its " +
          "value. A field also saves its value when it loses the focus.",
      )
      .addSlider((slider) =>
        slider
          .setLimits(COMMIT_DELAY_LIMITS.min, COMMIT_DELAY_LIMITS.max, COMMIT_DELAY_LIMITS.step)
          .setValue(this.host.settings.commitDelay)
          .setDynamicTooltip()
          .onChange((commitDelay) =>
            this.host.updateSettings({ ...this.host.settings, commitDelay }),
          ),
      );
    new Setting(containerEl)
      .setName("Schema registry")
      .setDesc(
        "Vault path of the YAML registry that maps logical schema identifiers to schema files. " +
          "Records declaring _schema use this registry before compatibility bindings.",
      )
      .addText((text) =>
        text
          .setPlaceholder("specs/schema-registry.yml")
          .setValue(this.host.settings.schemaRegistry)
          .onChange((schemaRegistry) =>
            this.host.updateSettings({ ...this.host.settings, schemaRegistry }),
          ),
      );
    new Setting(containerEl)
      .setName("Excluded paths")
      .setDesc(
        "Glob patterns, one per line, such as templates/**. A file whose path matches one binds " +
          "to no schema, whatever it declares, and opens in the source view.",
      )
      .addTextArea((area) =>
        area
          .setPlaceholder("templates/**")
          .setValue(this.host.settings.excludedPaths.join("\n"))
          .onChange((value) =>
            this.host.updateSettings({
              ...this.host.settings,
              excludedPaths: value.split("\n").filter((line) => line.trim() !== ""),
            }),
          ),
      );
    new Setting(containerEl)
      .setName("Path rules")
      .setDesc(
        "Each rule binds the files matched by a glob pattern, such as records/**/*.yml, to a " +
          "schema given by its path from the vault root. A file without _schema or a modeline takes the " +
          "schema of the first matching rule.",
      )
      .setHeading();
    this.host.settings.pathRules.forEach((rule, index) => this.ruleSetting(rule, index));
    new Setting(containerEl).addButton((button) =>
      button.setButtonText("Add a path rule").onClick(async () => {
        await this.setRules([...this.rules, { pattern: "", schema: "" }]);
        this.display();
      }),
    );
    new Setting(containerEl)
      .setName("Python integration")
      .setDesc(
        "Interpreter and commands supplied by the project. Python integration is available in " +
          "the desktop app only.",
      )
      .setHeading();
    new Setting(containerEl)
      .setName("Python interpreter")
      .setDesc(
        "Absolute path of the Python interpreter for the project environment. Leave empty to " +
          "keep Python checkers and generated-view commands disabled.",
      )
      .addText((text) =>
        text
          .setPlaceholder("/absolute/path/to/bin/python")
          .setValue(this.host.settings.pythonInterpreter)
          .onChange((pythonInterpreter) =>
            this.host.updateSettings({ ...this.host.settings, pythonInterpreter }),
          ),
      );
    new Setting(containerEl)
      .setName("Command timeout")
      .setDesc(
        "Maximum duration of one Python checker call or generated-view command, in milliseconds. " +
          "A timed-out operation stops its process.",
      )
      .addSlider((slider) =>
        slider
          .setLimits(
            CUSTOM_CHECKER_TIMEOUT_LIMITS.min,
            CUSTOM_CHECKER_TIMEOUT_LIMITS.max,
            CUSTOM_CHECKER_TIMEOUT_LIMITS.step,
          )
          .setValue(this.host.settings.customCheckerTimeout)
          .setDynamicTooltip()
          .onChange((customCheckerTimeout) =>
            this.host.updateSettings({ ...this.host.settings, customCheckerTimeout }),
          ),
      );
    new Setting(containerEl)
      .setName("Primary-view command")
      .setDesc(
        "JSON list of arguments passed to the Python interpreter. {vault} names the vault root, " +
          "and {target} names the completion target entered by the researcher. The producer must " +
          "return one JSON object with the generated YAML path.",
      )
      .addText((text) =>
        text
          .setPlaceholder(
            '["-m", "tool", "views", "{vault}", "--target", "{target}", "--result", "json"]',
          )
          .setValue(JSON.stringify(this.host.settings.primaryViewCommand))
          .onChange((value) => {
            const command = commandOfText(value);
            text.inputEl.toggleClass("mod-invalid", command === null);
            if (command !== null) {
              return this.host.updateSettings({
                ...this.host.settings,
                primaryViewCommand: command,
              });
            }
          }),
      );
    new Setting(containerEl)
      .setName("Custom checkers")
      .setDesc(
        "Registered Python functions that schemas may invoke by checker name. Only complete " +
          "registrations are supplied to the Python process.",
      )
      .setHeading();
    this.checkers.forEach((checker, index) => this.checkerSetting(checker, index));
    new Setting(containerEl).addButton((button) =>
      button.setButtonText("Add a custom checker").onClick(async () => {
        await this.setCheckers([...this.checkers, { name: "", module: "", function: "" }]);
        this.display();
      }),
    );
  }

  private get rules(): readonly PathRule[] {
    return this.host.settings.pathRules;
  }

  private ruleSetting(rule: PathRule, index: number): void {
    new Setting(this.containerEl)
      .setName(`Rule ${index + 1}`)
      .addText((text) =>
        labelInput(text, "Glob pattern")
          .setPlaceholder("records/**/*.yml")
          .setValue(rule.pattern)
          .onChange((pattern) => this.replaceRule(index, { ...this.ruleAt(index), pattern })),
      )
      .addText((text) =>
        labelInput(text, "Schema path")
          .setPlaceholder("schemas/record.schema.yaml")
          .setValue(rule.schema)
          .onChange((schema) => this.replaceRule(index, { ...this.ruleAt(index), schema })),
      )
      .addExtraButton((button) =>
        button
          .setIcon("arrow-up")
          .setTooltip("Apply this rule before the previous one")
          .setDisabled(index === 0)
          .onClick(async () => {
            const rules = [...this.rules];
            [rules[index - 1], rules[index]] = [this.ruleAt(index), this.ruleAt(index - 1)];
            await this.setRules(rules);
            this.display();
          }),
      )
      .addExtraButton((button) =>
        button
          .setIcon("trash")
          .setTooltip("Remove this rule")
          .onClick(async () => {
            await this.setRules(this.rules.filter((_, position) => position !== index));
            this.display();
          }),
      );
  }

  private ruleAt(index: number): PathRule {
    return this.rules[index] ?? { pattern: "", schema: "" };
  }

  private async replaceRule(index: number, rule: PathRule): Promise<void> {
    await this.setRules(
      this.rules.map((current, position) => (position === index ? rule : current)),
    );
  }

  private async setRules(pathRules: readonly PathRule[]): Promise<void> {
    await this.host.updateSettings({ ...this.host.settings, pathRules });
  }

  private get checkers(): readonly CustomCheckerRegistration[] {
    return this.host.settings.customCheckers;
  }

  private checkerSetting(checker: CustomCheckerRegistration, index: number): void {
    new Setting(this.containerEl)
      .setName(`Checker ${index + 1}`)
      .addText((text) =>
        labelInput(text, "Checker name")
          .setPlaceholder("declared-symbols")
          .setValue(checker.name)
          .onChange((name) => this.replaceChecker(index, { ...this.checkerAt(index), name })),
      )
      .addText((text) =>
        labelInput(text, "Module or file")
          .setPlaceholder("project.checks")
          .setValue(checker.module)
          .onChange((module) => this.replaceChecker(index, { ...this.checkerAt(index), module })),
      )
      .addText((text) =>
        labelInput(text, "Function")
          .setPlaceholder("declared_symbols")
          .setValue(checker.function)
          .onChange((func) =>
            this.replaceChecker(index, { ...this.checkerAt(index), function: func }),
          ),
      )
      .addExtraButton((button) =>
        button
          .setIcon("trash")
          .setTooltip("Remove this checker")
          .onClick(async () => {
            await this.setCheckers(this.checkers.filter((_, position) => position !== index));
            this.display();
          }),
      );
    new Setting(this.containerEl)
      .setDesc(
        "To check every instance of some schemas without a rule declared in them, list the " +
          "patterns of their identifiers, and give the arguments of each call as a JSON object.",
      )
      .addText((text) =>
        labelInput(text, "Instance schemas")
          .setPlaceholder("project:*, other:record@2")
          .setValue((checker.schemas ?? []).join(", "))
          .onChange((value) => {
            const schemas = value
              .split(",")
              .map((pattern) => pattern.trim())
              .filter((pattern) => pattern !== "");
            return this.replaceChecker(index, { ...this.checkerAt(index), schemas });
          }),
      )
      .addText((text) =>
        labelInput(text, "Arguments")
          .setPlaceholder('{"command": ["-m", "tool", "check", "{folder}"]}')
          .setValue(checker.arguments === undefined ? "" : JSON.stringify(checker.arguments))
          .onChange((value) => {
            const parsed = argumentsOfText(value);
            text.inputEl.toggleClass("mod-invalid", parsed === null);
            if (parsed === null) return;
            const { name, module, function: func, schemas } = this.checkerAt(index);
            return this.replaceChecker(index, {
              name,
              module,
              function: func,
              ...(schemas === undefined ? {} : { schemas }),
              ...(parsed === undefined ? {} : { arguments: parsed }),
            });
          }),
      );
  }

  private checkerAt(index: number): CustomCheckerRegistration {
    return this.checkers[index] ?? { name: "", module: "", function: "" };
  }

  private async replaceChecker(index: number, checker: CustomCheckerRegistration): Promise<void> {
    await this.setCheckers(
      this.checkers.map((current, position) => (position === index ? checker : current)),
    );
  }

  private async setCheckers(customCheckers: readonly CustomCheckerRegistration[]): Promise<void> {
    await this.host.updateSettings({ ...this.host.settings, customCheckers });
  }
}

/** Command arguments written as a JSON list of strings; `null` marks invalid input. */
function commandOfText(text: string): readonly string[] | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Arguments written as a JSON object: `undefined` for an empty text, and `null` for a text that
 * is no JSON object, which the input then marks without storing.
 */
function argumentsOfText(text: string): Readonly<Record<string, JsonValue>> | undefined | null {
  if (text.trim() === "") return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Readonly<Record<string, JsonValue>>)
      : null;
  } catch {
    return null;
  }
}

/** Places a label above the input of `text`, naming the role of the input. */
function labelInput(text: TextComponent, label: string): TextComponent {
  const wrapper = createDiv({ cls: "ekphrasis-labelled-input" });
  text.inputEl.replaceWith(wrapper);
  wrapper.createEl("label", { text: label });
  wrapper.appendChild(text.inputEl);
  return text;
}

/**
 * Settings tab: the commit delay of the form, and the path rules that bind instances without a
 * modeline to their schemas.
 */
import { PluginSettingTab, Setting, type App, type Plugin, type TextComponent } from "obsidian";
import { COMMIT_DELAY_LIMITS, type EkphrasisSettings } from "../../application";
import type { PathRule } from "../../domain";

/** Owner of the settings, which stores them and applies them to the open views. */
export interface SettingsHost {
  readonly settings: EkphrasisSettings;
  updateSettings(settings: EkphrasisSettings): Promise<void>;
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
      .setName("Path rules")
      .setDesc(
        "Each rule binds the files matched by a glob pattern, such as records/**/*.yml, to a " +
          "schema given by its path from the vault root. A file without a modeline takes the " +
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
}

/** Places a label above the input of `text`, naming the role of the input. */
function labelInput(text: TextComponent, label: string): TextComponent {
  const wrapper = createDiv({ cls: "ekphrasis-labelled-input" });
  text.inputEl.replaceWith(wrapper);
  wrapper.createEl("label", { text: label });
  wrapper.appendChild(text.inputEl);
  return text;
}

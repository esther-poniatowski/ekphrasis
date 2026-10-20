/**
 * Plugin class: composition root, lifecycle, and registration of the Obsidian integration
 * points (view, extensions, commands, settings tab, vault events).
 */
import { debounce, loadMathJax, Notice, Plugin, type TAbstractFile } from "obsidian";
import {
  CommitService,
  DEFAULT_SETTINGS,
  FormService,
  parseSettings,
  ValidationService,
  type EkphrasisSettings,
} from "../../application";
import {
  AjvSchemaValidator,
  FileSchemaLoader,
  YamlDocumentParser,
  YamlSourceEditor,
} from "../../infrastructure";
import { COMMANDS, registerCommands } from "./commands";
import { INSTANCE_VIEW_TYPE, YAML_EXTENSIONS } from "./constants";
import { refusalNotice, registerExtensions } from "./extension-registration";
import { OBSIDIAN_CHECKER_ENVIRONMENT } from "./formula-renderer";
import { EkphrasisSettingTab, type SettingsHost } from "./settings-tab";
import { createDefaultRegistry } from "./ui/default-registry";
import { VaultFileSource } from "./vault-file-source";
import { InstanceView } from "./views/instance-view";
import { OutlineChannel } from "./views/outline-channel";

/** Delay after the last change of the settings before the open views are rebuilt. */
const SETTINGS_REFRESH_DELAY_MS = 500;

/** Display duration of the notice reporting a refused extension. */
const REFUSAL_NOTICE_DURATION_MS = 15_000;

export default class EkphrasisPlugin extends Plugin implements SettingsHost {
  override settings: EkphrasisSettings = DEFAULT_SETTINGS;

  private readonly refreshViewsSoon = debounce(
    () => this.instanceViews().forEach((view) => void view.refresh()),
    SETTINGS_REFRESH_DELAY_MS,
    true,
  );

  override async onload(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
    const parser = new YamlDocumentParser();
    const settings = (): EkphrasisSettings => this.settings;
    // The checker `latex` renders through MathJax, which Obsidian loads on demand.
    loadMathJax().catch((error: unknown) =>
      console.warn("ekphrasis: MathJax did not load.", error),
    );
    const validation = new ValidationService(
      new AjvSchemaValidator(),
      OBSIDIAN_CHECKER_ENVIRONMENT,
    );
    const forms = new FormService(
      parser,
      new FileSchemaLoader(new VaultFileSource(this.app.vault)),
      validation,
      settings,
    );
    const commits = new CommitService(parser, new YamlSourceEditor(), validation);
    const registry = createDefaultRegistry();
    const outline = new OutlineChannel();
    this.registerView(
      INSTANCE_VIEW_TYPE,
      (leaf) => new InstanceView(leaf, { forms, commits, registry, settings, outline }),
    );

    const refused = registerExtensions(YAML_EXTENSIONS, (extensions) =>
      this.registerExtensions(extensions, INSTANCE_VIEW_TYPE),
    );
    if (refused.length > 0) {
      new Notice(refusalNotice(refused, COMMANDS.openInEkphrasis.name), REFUSAL_NOTICE_DURATION_MS);
    }

    registerCommands(this);
    this.addSettingTab(new EkphrasisSettingTab(this.app, this, this));

    const { vault } = this.app;
    const onFileEvent = (file: TAbstractFile, oldPath?: string): void =>
      this.refreshDependents([file.path, ...(oldPath === undefined ? [] : [oldPath])]);
    this.registerEvent(vault.on("modify", onFileEvent));
    this.registerEvent(vault.on("create", onFileEvent));
    this.registerEvent(vault.on("delete", onFileEvent));
    this.registerEvent(vault.on("rename", onFileEvent));
  }

  /** Reloads the settings changed outside, for instance by a synchronization service. */
  override async onExternalSettingsChange(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
    this.refreshViewsSoon();
  }

  async updateSettings(settings: EkphrasisSettings): Promise<void> {
    this.settings = settings;
    await this.saveData(settings);
    this.refreshViewsSoon();
  }

  /** Rebuilds the forms built from one of the schema files at `paths`. */
  private refreshDependents(paths: readonly string[]): void {
    for (const view of this.instanceViews()) {
      if (paths.some((path) => view.dependsOn(path))) void view.refresh();
    }
  }

  private instanceViews(): InstanceView[] {
    return this.app.workspace
      .getLeavesOfType(INSTANCE_VIEW_TYPE)
      .flatMap((leaf) => (leaf.view instanceof InstanceView ? [leaf.view] : []));
  }
}

/**
 * Plugin class: composition root, lifecycle, and registration of the Obsidian integration
 * points (views, extensions, commands, settings tab, vault events, index of record identifiers,
 * suggestions of field paths and handler of the URIs of ekphrasis).
 */
import { debounce, loadMathJax, Notice, Plugin, type TAbstractFile } from "obsidian";
import {
  CommitService,
  DEFAULT_SETTINGS,
  FormService,
  IdentifierIndexService,
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
import { LINK_ACTION } from "../../domain";
import { COMMANDS, registerCommands } from "./commands";
import { INSTANCE_VIEW_TYPE, OUTLINE_VIEW_TYPE, YAML_EXTENSIONS } from "./constants";
import { refusalNotice, registerExtensions } from "./extension-registration";
import { FieldLinkOpener } from "./field-link-opener";
import { FieldPathSuggest } from "./field-path-suggest";
import { OBSIDIAN_CHECKER_ENVIRONMENT } from "./formula-renderer";
import { rebuildRecordIdentifiersSoon, watchRecordIdentifiers } from "./identifier-watcher";
import { EkphrasisSettingTab, type SettingsHost } from "./settings-tab";
import { createDefaultRegistry } from "./ui/default-registry";
import { VaultFileSource } from "./vault-file-source";
import { InstanceView } from "./views/instance-view";
import { OutlineChannel } from "./views/outline-channel";
import { OutlineView } from "./views/outline-view";

/**
 * Delay after the last change of the settings before the open views are rebuilt, and before the
 * records are indexed again when the path rules changed.
 */
const SETTINGS_REFRESH_DELAY_MS = 500;

/** Display duration of the notice reporting a refused extension. */
const REFUSAL_NOTICE_DURATION_MS = 15_000;

export default class EkphrasisPlugin extends Plugin implements SettingsHost {
  override settings: EkphrasisSettings = DEFAULT_SETTINGS;
  /** Index of the identifiers of the records of the vault, built in `onload`. */
  private identifiers: IdentifierIndexService | null = null;

  private readonly refreshViewsSoon = debounce(
    () => this.instanceViews().forEach((view) => void view.refresh()),
    SETTINGS_REFRESH_DELAY_MS,
    true,
  );

  /** Indexes every record again, after the last change of the path rules. */
  private readonly rebuildIdentifiersSoon = debounce(
    () => {
      if (this.identifiers !== null) rebuildRecordIdentifiersSoon(this, this.identifiers);
    },
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
    const files = new VaultFileSource(this.app.vault);
    const forms = new FormService(parser, new FileSchemaLoader(files), validation, settings);
    const identifiers = new IdentifierIndexService(
      parser,
      files,
      new FileSchemaLoader(files),
      settings,
    );
    this.identifiers = identifiers;
    const links = new FieldLinkOpener(
      this.app,
      identifiers,
      watchRecordIdentifiers(this, identifiers),
    );
    const commits = new CommitService(parser, new YamlSourceEditor(), validation);
    const registry = createDefaultRegistry();
    const outline = new OutlineChannel();
    this.registerView(
      INSTANCE_VIEW_TYPE,
      (leaf) =>
        new InstanceView(leaf, {
          forms,
          commits,
          registry,
          settings,
          outline,
          followUri: (uri, newLeaf) => links.followUri(uri, newLeaf),
        }),
    );
    this.registerView(OUTLINE_VIEW_TYPE, (leaf) => new OutlineView(leaf, outline));

    const refused = registerExtensions(YAML_EXTENSIONS, (extensions) =>
      this.registerExtensions(extensions, INSTANCE_VIEW_TYPE),
    );
    if (refused.length > 0) {
      new Notice(refusalNotice(refused, COMMANDS.openInEkphrasis.name), REFUSAL_NOTICE_DURATION_MS);
    }

    registerCommands(this, identifiers);
    this.registerEditorSuggest(new FieldPathSuggest(this.app, forms));
    this.registerObsidianProtocolHandler(LINK_ACTION, (parameters) => {
      links
        .followQuery(parameters)
        .catch((error: unknown) =>
          console.error("ekphrasis: the link could not be followed.", error),
        );
    });
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
    this.applySettings(parseSettings(await this.loadData()));
  }

  async updateSettings(settings: EkphrasisSettings): Promise<void> {
    this.applySettings(settings);
    await this.saveData(settings);
  }

  /**
   * Replaces the settings, rebuilds the open forms, and indexes every record again when the path
   * rules change, since a rule can bind a file to another schema.
   */
  private applySettings(settings: EkphrasisSettings): void {
    const rulesChanged =
      JSON.stringify(settings.pathRules) !== JSON.stringify(this.settings.pathRules);
    this.settings = settings;
    if (rulesChanged) this.rebuildIdentifiersSoon();
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

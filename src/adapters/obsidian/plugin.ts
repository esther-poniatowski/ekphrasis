/**
 * Plugin class: composition root, lifecycle, and registration of the Obsidian integration
 * points (views, extensions, commands, settings tab, vault events, index of record identifiers,
 * suggestions of field paths and handler of the URIs of ekphrasis, setup diagnostic). Once the
 * workspace is restored at the first load of the plugin, the outline opens in the right sidebar.
 */
import {
  debounce,
  FileSystemAdapter,
  loadMathJax,
  normalizePath,
  Notice,
  Platform,
  Plugin,
  type TAbstractFile,
} from "obsidian";
import {
  CommitService,
  completeCustomCheckers,
  CustomCheckerService,
  DEFAULT_SETTINGS,
  FormService,
  IdentifierIndexService,
  InstanceCreationService,
  parseSettings,
  RegistryReader,
  resolveCustomCheckerModules,
  runSetupDiagnostic,
  ValidationService,
  type DiagnosticReport,
  type CustomCheckerRegistration,
  type EkphrasisSettings,
  type CustomCheckerRunner,
} from "../../application";
import {
  AjvSchemaValidator,
  FileSchemaLoader,
  PythonCheckerProcess,
  ConfiguredCommandProcess,
  GeneratedViewProcess,
  PythonSetupProbe,
  writeAccessOf,
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
import { VaultInstanceStore } from "./vault-instance-store";
import { ObsidianVaultInspector } from "./vault-inspector";
import { SetupDiagnosticModal } from "./views/diagnostic-modal";
import { InstanceView } from "./views/instance-view";
import { openInstanceCreator } from "./views/instance-creation-modal";
import { openPrimaryViewTarget } from "./views/primary-view-modal";
import { OutlineChannel } from "./views/outline-channel";
import {
  OUTLINE_PLACED_KEY,
  outlinePlacedIn,
  placeOutlineAtFirstLoad,
} from "./views/outline-placement";
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
  /** Python checker process configured for this vault; started lazily by its first call. */
  private checkerRunner: CustomCheckerRunner | null = null;
  /** Whether the outline was placed at an earlier load, as the data of the plugin records. */
  private outlinePlaced = false;
  /** Time at which the plugin loaded, after which a change of an unindexed schema needs a restart. */
  private loadedAt = Date.now();
  /** Runs the setup diagnostic on the current settings and the current record, built in `onload`. */
  private diagnostic: (() => Promise<DiagnosticReport>) | null = null;

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
    const data: unknown = await this.loadData();
    this.settings = parseSettings(data);
    this.outlinePlaced = outlinePlacedIn(data);
    this.loadedAt = Date.now();
    this.replaceCheckerRunner(this.settings);
    this.register(() => this.closeCheckerRunner());
    const parser = new YamlDocumentParser();
    const settings = (): EkphrasisSettings => this.settings;
    // The checker `latex` renders through MathJax, which Obsidian loads on demand.
    loadMathJax().catch((error: unknown) =>
      console.warn("ekphrasis: MathJax did not load.", error),
    );
    const customCheckers = new CustomCheckerService(
      () => completeCustomCheckers(this.settings.customCheckers),
      () => this.checkerRunner,
      (path) => this.absoluteVaultPath(path),
      () =>
        Platform.isDesktopApp
          ? "no Python interpreter is set: enter its absolute path under *Python interpreter* in the settings of ekphrasis"
          : "Python checkers run only in the desktop app of Obsidian: open this file on a desktop computer to see their findings",
    );
    const validation = new ValidationService(
      new AjvSchemaValidator(),
      OBSIDIAN_CHECKER_ENVIRONMENT,
      () => customCheckers.checkerNames,
    );
    const files = new VaultFileSource(this.app.vault);
    const resources = new RegistryReader(parser, files, settings);
    const schemaLoader = new FileSchemaLoader(files, resources);
    const forms = new FormService(
      parser,
      schemaLoader,
      validation,
      settings,
      files,
      customCheckers,
    );
    const identifiers = new IdentifierIndexService(parser, files, schemaLoader, settings);
    const creation = new InstanceCreationService(
      resources,
      schemaLoader,
      new VaultInstanceStore(this.app.vault),
      (created) => this.runPostCreation(created.path, created.identifier),
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
    const inspector = new ObsidianVaultInspector(this.app.vault, writeAccessOf);
    const validator = new AjvSchemaValidator();
    this.diagnostic = () => {
      const view =
        this.app.workspace.getActiveViewOfType(InstanceView) ??
        (outline.source instanceof InstanceView ? outline.source : null);
      const path = view?.filePath ?? null;
      return runSetupDiagnostic({
        settings: this.settings,
        desktop: Platform.isDesktopApp,
        record:
          view === null || path === null
            ? null
            : { path, text: view.getViewData(), state: view.formState },
        registry: resources,
        files,
        parser,
        loader: new FileSchemaLoader(files, resources),
        validator,
        vault: inspector,
        probe: Platform.isDesktopApp ? new PythonSetupProbe() : null,
        loadedAt: this.loadedAt,
        resolveFile: (vaultPath) => this.absoluteVaultPath(vaultPath),
        now: () => Date.now(),
      });
    };
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
    // The outline opens in the right sidebar at the first load, once the workspace is restored.
    this.app.workspace.onLayoutReady(() => {
      placeOutlineAtFirstLoad(this.app.workspace, this.outlinePlaced, async () => {
        this.outlinePlaced = true;
        await this.saveStoredData();
      }).catch((error: unknown) =>
        console.error("ekphrasis: the outline could not be opened.", error),
      );
    });

    const refused = registerExtensions(YAML_EXTENSIONS, (extensions) =>
      this.registerExtensions(extensions, INSTANCE_VIEW_TYPE),
    );
    if (refused.length > 0) {
      new Notice(refusalNotice(refused, COMMANDS.openInEkphrasis.name), REFUSAL_NOTICE_DURATION_MS);
    }

    registerCommands(
      this,
      identifiers,
      () => this.restartCheckerRunner(),
      () => this.diagnoseSetup(),
      () => openInstanceCreator(this.app, creation),
      (checking) => {
        if (!creation.canRetryFollowUp) return false;
        if (!checking) void this.retryPostCreation(creation);
        return true;
      },
      () => this.openPrimaryView(),
    );
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

  /** Opens the report of the setup diagnostic, which reads the setup and changes nothing. */
  diagnoseSetup(): void {
    if (this.diagnostic !== null) new SetupDiagnosticModal(this.app, this.diagnostic).open();
  }

  /** Asks for an explicit target, runs its configured producer and opens the reported view. */
  private openPrimaryView(): void {
    if (!Platform.isDesktopApp) {
      new Notice("Ekphrasis: generated-view commands run only in the desktop app.");
      return;
    }
    if (this.settings.pythonInterpreter.trim() === "") {
      new Notice("Ekphrasis: configure the Python interpreter before generating a view.");
      return;
    }
    if (this.settings.primaryViewCommand.length === 0) {
      new Notice("Ekphrasis: configure the primary-view command before generating a view.");
      return;
    }
    const runner = new GeneratedViewProcess(
      this.settings.pythonInterpreter,
      this.absoluteVaultPath(""),
      this.settings.customCheckerTimeout,
    );
    openPrimaryViewTarget(this.app, (target) =>
      runner.run(this.settings.primaryViewCommand, target),
    );
  }

  /** Let the configured producer update its own related files after generic instance creation. */
  private async runPostCreation(path: string, schema: string): Promise<void> {
    const command = this.settings.postCreationCommand;
    if (command.length === 0) return;
    if (!Platform.isDesktopApp) {
      throw new Error("post-creation commands run only in the desktop app");
    }
    const interpreter = this.settings.pythonInterpreter.trim();
    if (interpreter === "") {
      throw new Error("configure the Python interpreter to run the post-creation command");
    }
    const vault = this.absoluteVaultPath("");
    const runner = new ConfiguredCommandProcess(
      interpreter,
      vault,
      this.settings.customCheckerTimeout,
    );
    await runner.run(command, { vault, path, schema });
  }

  /** Retry a failed producer-owned follow-up without creating its record again. */
  private async retryPostCreation(creation: InstanceCreationService): Promise<void> {
    const retried = await creation.retryFollowUp();
    if (retried === null) return;
    if (retried.followUpError === undefined) {
      new Notice(`Ekphrasis: completed the post-creation action for ${retried.path}.`);
      return;
    }
    new Notice(
      `Ekphrasis: the post-creation action for ${retried.path} still failed: ${retried.followUpError}. Correct the cause, then run *${COMMANDS.retryPostCreation.name}* again.`,
      15_000,
    );
  }

  /** Reloads the settings changed outside, for instance by a synchronization service. */
  override async onExternalSettingsChange(): Promise<void> {
    this.applySettings(parseSettings(await this.loadData()));
  }

  async updateSettings(settings: EkphrasisSettings): Promise<void> {
    this.applySettings(settings);
    await this.saveStoredData();
  }

  /** Saves the settings, with the record of the placement of the outline. */
  private async saveStoredData(): Promise<void> {
    await this.saveData({ ...this.settings, [OUTLINE_PLACED_KEY]: this.outlinePlaced });
  }

  /**
   * Replaces the settings, rebuilds the open forms, and indexes every record again when the path
   * rules or the excluded paths change, since either can bind a file to another schema or to none.
   */
  private applySettings(settings: EkphrasisSettings): void {
    const rulesChanged =
      JSON.stringify(settings.pathRules) !== JSON.stringify(this.settings.pathRules) ||
      JSON.stringify(settings.excludedPaths) !== JSON.stringify(this.settings.excludedPaths);
    const registryChanged = settings.schemaRegistry !== this.settings.schemaRegistry;
    const checkersChanged =
      settings.pythonInterpreter !== this.settings.pythonInterpreter ||
      settings.customCheckerTimeout !== this.settings.customCheckerTimeout ||
      JSON.stringify(settings.customCheckers) !== JSON.stringify(this.settings.customCheckers);
    this.settings = settings;
    if (checkersChanged) this.replaceCheckerRunner(settings);
    if (rulesChanged || registryChanged) this.rebuildIdentifiersSoon();
    this.refreshViewsSoon();
  }

  /** Replace the lazy checker process after its interpreter or registrations change. */
  private replaceCheckerRunner(settings: EkphrasisSettings): void {
    this.closeCheckerRunner();
    if (!Platform.isDesktopApp || settings.pythonInterpreter.trim() === "") return;
    this.checkerRunner = new PythonCheckerProcess(
      settings.pythonInterpreter,
      this.checkerRegistrations(settings),
      settings.customCheckerTimeout,
    );
  }

  /** Restart the configured process and refresh each form so it receives current results. */
  private async restartCheckerRunner(): Promise<boolean> {
    const runner = this.checkerRunner;
    if (runner === null) return false;
    await runner.restart();
    await Promise.all(this.instanceViews().map((view) => view.refresh()));
    return true;
  }

  /** Resolve a checker file inside the desktop vault to the absolute path required by Python. */
  private checkerRegistrations(settings: EkphrasisSettings): readonly CustomCheckerRegistration[] {
    return resolveCustomCheckerModules(completeCustomCheckers(settings.customCheckers), (path) =>
      this.absoluteVaultPath(path),
    );
  }

  /** Absolute path of a vault file on a desktop filesystem; unused where no runner exists. */
  private absoluteVaultPath(path: string): string {
    const adapter = this.app.vault.adapter;
    return adapter instanceof FileSystemAdapter
      ? adapter.getFullPath(normalizePath(path))
      : normalizePath(path);
  }

  /** Close the checker process without delaying plugin unload or a settings update. */
  private closeCheckerRunner(): void {
    const runner = this.checkerRunner;
    this.checkerRunner = null;
    if (runner !== null) {
      void runner
        .close()
        .catch((error: unknown) =>
          console.error("ekphrasis: Python checkers did not stop.", error),
        );
    }
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

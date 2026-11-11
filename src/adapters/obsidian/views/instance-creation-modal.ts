/** Obsidian interaction for choosing a registered schema and the path of a new record. */
import {
  FuzzySuggestModal,
  Modal,
  Notice,
  Setting,
  type App,
  type ButtonComponent,
} from "obsidian";
import {
  InstanceCreationError,
  type CreatableSchema,
  type InstanceCreationService,
} from "../../../application";
import { folderOf } from "../../../domain";
import { INSTANCE_VIEW_TYPE } from "../constants";

export function openInstanceCreator(app: App, creation: InstanceCreationService): void {
  creation
    .availableSchemas()
    .then((schemas) => {
      if (schemas.length === 0) {
        new Notice("Ekphrasis: the registry contains no writable schemas.");
        return;
      }
      new SchemaChooser(app, schemas, (schema) =>
        new InstancePathModal(app, creation, schema).open(),
      ).open();
    })
    .catch((error: unknown) => reportCreationFailure(error));
}

class SchemaChooser extends FuzzySuggestModal<CreatableSchema> {
  constructor(
    app: App,
    private readonly schemas: readonly CreatableSchema[],
    private readonly choose: (schema: CreatableSchema) => void,
  ) {
    super(app);
    this.setPlaceholder("Choose the kind of research record");
  }

  getItems(): CreatableSchema[] {
    return [...this.schemas];
  }

  getItemText(schema: CreatableSchema): string {
    return `${schema.title} — ${schema.identifier}`;
  }

  onChooseItem(schema: CreatableSchema): void {
    this.choose(schema);
  }
}

class InstancePathModal extends Modal {
  private path = "";
  private createButton: ButtonComponent | null = null;

  constructor(
    app: App,
    private readonly creation: InstanceCreationService,
    private readonly schema: CreatableSchema,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText(`Create ${this.schema.title}`);
    this.path = suggestedPath(this.app, this.schema.identifier);
    new Setting(this.contentEl)
      .setName("Record path")
      .setDesc("Vault-relative path ending in .yml or .yaml")
      .addText((text) => {
        text.setValue(this.path).onChange((value) => {
          this.path = value;
        });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") void this.create();
        });
        text.inputEl.focus();
        text.inputEl.select();
      })
      .addButton((button) => {
        this.createButton = button;
        button
          .setCta()
          .setButtonText("Create")
          .onClick(() => void this.create());
      });
  }

  override onClose(): void {
    this.contentEl.empty();
  }

  private async create(): Promise<void> {
    if (this.createButton?.disabled) return;
    this.createButton?.setDisabled(true);
    try {
      const created = await this.creation.create(this.schema.identifier, this.path);
      this.close();
      await this.app.workspace.getLeaf(false).setViewState({
        type: INSTANCE_VIEW_TYPE,
        state: { file: created.path },
        active: true,
      });
      new Notice(`Ekphrasis: created ${created.path}.`);
    } catch (error) {
      reportCreationFailure(error);
      this.createButton?.setDisabled(false);
    }
  }
}

function suggestedPath(app: App, identifier: string): string {
  const folder = folderOf(app.workspace.getActiveFile()?.path ?? "");
  const kind = (identifier.split(":").at(-1) ?? "record").split("@")[0] ?? "record";
  const name = `new-${kind.replace(/[^a-z0-9-]+/giu, "-").toLowerCase()}.yml`;
  return folder === "" ? name : `${folder}/${name}`;
}

function reportCreationFailure(error: unknown): void {
  if (error instanceof InstanceCreationError) {
    new Notice(`Ekphrasis: ${error.message}`);
    return;
  }
  console.error("ekphrasis: the instance could not be created.", error);
  new Notice(
    "Ekphrasis: the instance could not be created; the developer console holds the error.",
  );
}

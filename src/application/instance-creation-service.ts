/** Registry-backed creation of a new instance. */
import {
  extensionOf,
  DEFAULT_BINDING_KEY,
  declaredContract,
  instanceSkeleton,
  resolveVaultPath,
  SchemaView,
  type JsonObject,
} from "../domain";
import { EkphrasisError } from "../errors";
import type { InstanceStore, SchemaLoader } from "./protocols";
import type { RegistryReader } from "./registry-reader";

export interface CreatableSchema {
  readonly identifier: string;
  readonly schemaPath: string;
  readonly title: string;
}

export interface CreatedInstance {
  readonly path: string;
  readonly identifier: string;
  /** Failure of an optional producer-owned follow-up; the instance itself still exists. */
  readonly followUpError?: string;
}

export type AfterInstanceCreation = (instance: CreatedInstance) => Promise<void>;

export class InstanceCreationError extends EkphrasisError {
  override name = "InstanceCreationError";
}

export class InstanceCreationService {
  private failedFollowUp: CreatedInstance | null = null;

  constructor(
    private readonly registry: RegistryReader,
    private readonly schemas: SchemaLoader,
    private readonly store: InstanceStore,
    private readonly afterCreate: AfterInstanceCreation | null = null,
    private readonly bindingKey: () => string = () => DEFAULT_BINDING_KEY,
  ) {}

  /** Whether the last failed producer-owned follow-up remains available to retry. */
  get canRetryFollowUp(): boolean {
    return this.failedFollowUp !== null && this.afterCreate !== null;
  }

  /** Writable contracts in registry order. */
  async availableSchemas(): Promise<readonly CreatableSchema[]> {
    const state = await this.registry.read();
    if (state.status === "unconfigured") {
      throw new InstanceCreationError("No schema registry is configured.");
    }
    if (state.status === "invalid")
      throw new InstanceCreationError(`The registry is invalid: ${state.reason}.`);

    const available: CreatableSchema[] = [];
    for (const [identifier, target] of state.registry.schemas) {
      const schemaPath = resolveVaultPath("", target);
      if (schemaPath === null || schemaPath === "") {
        throw new InstanceCreationError(
          `The schema path registered for \`${identifier}\` leaves the vault.`,
        );
      }
      const root = SchemaView.root(await this.schemas.load(schemaPath));
      if (root.readOnly) continue;
      assertContract(root, identifier, this.bindingKey());
      available.push({ identifier, schemaPath, title: root.title ?? identifier });
    }
    return available;
  }

  /** Creates one new YAML record; an existing file is never overwritten. */
  async create(identifier: string, reference: string): Promise<CreatedInstance> {
    const path = instancePath(reference);
    if (await this.store.exists(path)) {
      throw new InstanceCreationError(`The file \`${path}\` already exists.`);
    }
    const contract = (await this.availableSchemas()).find(
      (candidate) => candidate.identifier === identifier,
    );
    if (contract === undefined) {
      throw new InstanceCreationError(`The writable schema \`${identifier}\` is not registered.`);
    }
    const root = SchemaView.root(await this.schemas.load(contract.schemaPath));
    const value: JsonObject = instanceSkeleton(root, identifier, this.bindingKey());
    await this.store.create(path, value);
    const created = { path, identifier };
    if (this.afterCreate === null) return created;
    try {
      await this.afterCreate(created);
      return created;
    } catch (error) {
      const failed = {
        ...created,
        followUpError: error instanceof Error ? error.message : "the post-creation command failed",
      };
      this.failedFollowUp = failed;
      return failed;
    }
  }

  /** Retry the last failed producer-owned follow-up without creating the record again. */
  async retryFollowUp(): Promise<CreatedInstance | null> {
    const failed = this.failedFollowUp;
    if (failed === null || this.afterCreate === null) return null;
    this.failedFollowUp = null;
    const created = { path: failed.path, identifier: failed.identifier };
    try {
      await this.afterCreate(created);
      return created;
    } catch (error) {
      const repeated = {
        ...created,
        followUpError: error instanceof Error ? error.message : "the post-creation command failed",
      };
      this.failedFollowUp = repeated;
      return repeated;
    }
  }
}

function assertContract(schema: SchemaView, identifier: string, bindingKey: string): void {
  if (declaredContract(schema, bindingKey) !== identifier) {
    throw new InstanceCreationError(
      `The schema registered as \`${identifier}\` must declare that identifier as the constant value of \`${bindingKey}\`.`,
    );
  }
}

function instancePath(reference: string): string {
  const written = reference.trim();
  const path =
    written.startsWith("/") || written.includes("\\") ? null : resolveVaultPath("", written);
  if (path === null || path === "") {
    throw new InstanceCreationError("Enter a YAML path inside the vault.");
  }
  if (!(["yaml", "yml"] as const).includes(extensionOf(path) as "yaml" | "yml")) {
    throw new InstanceCreationError("The new record path must end in `.yaml` or `.yml`.");
  }
  return path;
}

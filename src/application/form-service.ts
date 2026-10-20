/**
 * Use case that opens a form: runs the stages of parsing, binding, modelling and validation of
 * the form pipeline on the text of an instance, and reports the first stage that fails.
 */
import {
  buildFormModel,
  ItemIdentities,
  resolveBinding,
  type BindingSource,
  type FormModel,
  type SchemaBinding,
  type SchemaSet,
  type YamlNode,
} from "../domain";
import { SchemaError, YamlParseError } from "../errors";
import type { DocumentParser, SchemaLoader } from "./protocols";
import type { EkphrasisSettings } from "./settings";
import type { ValidationReport, ValidationService } from "./validation-service";

/** Outcome of opening an instance, one variant per stage that can stop the pipeline. */
export type FormState =
  /** No modeline and no path rule names a schema: the file opens in the source view. */
  | { readonly status: "unbound" }
  /** A modeline or a rule names a schema outside the vault. */
  | {
      readonly status: "invalid-binding";
      readonly source: BindingSource;
      readonly reference: string;
      readonly reason: string;
    }
  /** The text of the instance fails to parse. */
  | {
      readonly status: "parse-error";
      readonly binding: SchemaBinding;
      readonly error: YamlParseError;
    }
  /** The schema fails to load. */
  | {
      readonly status: "schema-error";
      readonly binding: SchemaBinding;
      readonly error: SchemaError;
      readonly schemaPaths: readonly string[];
    }
  | FormReady;

/** Outcome of a pipeline that reached the form, built from one text of the instance. */
export interface FormReady {
  readonly status: "form";
  readonly binding: SchemaBinding;
  readonly model: FormModel;
  /** Issues of the instance, checked against the schemas of the model. */
  readonly report: ValidationReport;
  /** Schemas of the model, kept so that a commit rebuilds the model without reloading them. */
  readonly schemas: SchemaSet;
  /** Vault paths of the schema files read, so a change of one of them reopens the form. */
  readonly schemaPaths: readonly string[];
}

export class FormService {
  constructor(
    private readonly parser: DocumentParser,
    private readonly schemas: SchemaLoader,
    private readonly validation: ValidationService,
    private readonly settings: () => EkphrasisSettings,
  ) {}

  /**
   * Opens the instance at the vault path `path`, holding `text`. The items of sequences take
   * their identifiers from `identities`.
   */
  async open(
    path: string,
    text: string,
    identities: ItemIdentities = new ItemIdentities(),
  ): Promise<FormState> {
    const result = resolveBinding(path, text, this.settings().pathRules);
    if (result.status === "unbound") return result;
    if (result.status === "invalid") {
      const { source, reference, reason } = result;
      return { status: "invalid-binding", source, reference, reason };
    }
    const { binding } = result;
    let tree: YamlNode;
    try {
      tree = this.parser.parse(text);
    } catch (error) {
      if (error instanceof YamlParseError) return { status: "parse-error", binding, error };
      throw error;
    }
    try {
      const schemas = await this.schemas.load(binding.schemaPath);
      const model = buildFormModel(schemas, tree, text, identities);
      const report = this.validation.validate(schemas, model, tree);
      return { status: "form", binding, model, report, schemas, schemaPaths: schemas.paths };
    } catch (error) {
      if (!(error instanceof SchemaError)) throw error;
      const schemaPaths = [...new Set([binding.schemaPath, error.schemaPath])];
      return { status: "schema-error", binding, error, schemaPaths };
    }
  }
}

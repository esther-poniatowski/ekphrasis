/**
 * Implementation of the `SchemaValidator` port with Ajv, the validator of draft 2020-12.
 *
 * The options follow the decision on the schema dialect and the spike on Ajv: `strict` is
 * disabled, so the keywords prefixed `x-` compile, and every error is collected. The keyword
 * `format` is not checked, since Ajv validates formats only through the extension
 * `ajv-formats`, which the dependencies do not include.
 */
import Ajv2020, { type AnySchema, type ErrorObject, type Options } from "ajv/dist/2020";
import type { InstanceValidator, SchemaValidator } from "../../application";
import {
  asJsonValue,
  documentUri,
  isJsonObject,
  validatorDocuments,
  type JsonValue,
  type SchemaSet,
  type ValidatorError,
} from "../../domain";
import { SchemaCompileError } from "../../errors";
import { nameBareSymbols } from "../library-messages";

const OPTIONS: Options = {
  strict: false,
  allErrors: true,
  validateFormats: false,
  logger: false,
};

export class AjvSchemaValidator implements SchemaValidator {
  /** @throws SchemaCompileError When Ajv refuses a schema of the set. */
  compile(schemas: SchemaSet): InstanceValidator {
    // One Ajv instance per schema set, so documents of two sets never share a registry.
    const ajv = new Ajv2020(OPTIONS);
    try {
      for (const document of validatorDocuments(schemas)) {
        ajv.addSchema(document.schema as AnySchema, document.uri);
      }
      const validate = ajv.getSchema(documentUri(schemas.rootPath));
      if (validate === undefined) throw new Error("the root schema was not registered");
      return {
        validate(instance: JsonValue): readonly ValidatorError[] {
          return validate(instance) ? [] : (validate.errors ?? []).map(toValidatorError);
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // The URIs of the documents are internal, so a message cites their vault paths instead.
      const readable = message.split(documentUri("")).join("");
      throw new SchemaCompileError(
        `The validator could not compile the schema: ${nameBareSymbols(readable)}.`,
        schemas.rootPath,
      );
    }
  }
}

function toValidatorError(error: ErrorObject): ValidatorError {
  const params = asJsonValue(error.params);
  return {
    pointer: error.instancePath,
    keyword: error.keyword,
    params: isJsonObject(params) ? params : {},
    message: error.message ?? "",
    propertyName: error.propertyName ?? null,
  };
}

/**
 * Validation service of the tests, with the Ajv validator and no host capability.
 */
import { ValidationService } from "../../src/application";
import { AjvSchemaValidator } from "../../src/infrastructure";

export function createValidation(): ValidationService {
  return new ValidationService(new AjvSchemaValidator());
}

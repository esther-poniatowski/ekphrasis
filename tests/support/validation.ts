/**
 * Validation service of the tests, with the Ajv validator and, unless given, no host capability.
 */
import { ValidationService } from "../../src/application";
import { NO_HOST, type CheckerEnvironment } from "../../src/domain";
import { AjvSchemaValidator } from "../../src/infrastructure";

export function createValidation(environment: Partial<CheckerEnvironment> = {}): ValidationService {
  return new ValidationService(new AjvSchemaValidator(), { ...NO_HOST, ...environment });
}

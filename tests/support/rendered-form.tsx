/**
 * Form panel rendered in a simulated DOM through the session of an instance, as the instance
 * view renders it: each commit rebuilds the form and renders the panel again, and so does each
 * change of the folded state. Component tests need the environment `happy-dom`.
 */
import { render } from "@testing-library/preact";
import type { ComponentChild } from "preact";
import {
  CommitService,
  DEFAULT_SETTINGS,
  FormService,
  InstanceSession,
  RegistryReader,
  type CustomCheckerService,
  type EkphrasisSettings,
  type FileSource,
} from "../../src/application";
import { createDefaultRegistry } from "../../src/adapters/obsidian/ui/default-registry";
import { FoldState } from "../../src/adapters/obsidian/ui/fold-state";
import type { LossRequest } from "../../src/adapters/obsidian/ui/form-context";
import { FormPanel } from "../../src/adapters/obsidian/ui/form-panel";
import { HelpState } from "../../src/adapters/obsidian/ui/help-state";
import { NO_ICONS } from "../../src/adapters/obsidian/ui/icon";
import { OptionalFieldState } from "../../src/adapters/obsidian/ui/optional-field-state";
import { IMMEDIATE_SCHEDULER } from "../../src/adapters/obsidian/ui/rendering/render-queue";
import { TEXT_RENDERER } from "../../src/adapters/obsidian/ui/rendering/value-renderer";
import type { PathRule, YamlPath } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser, YamlSourceEditor } from "../../src/infrastructure";
import { createValidation } from "./validation";

export interface RenderedForm {
  readonly container: Element;
  readonly session: InstanceSession;
  readonly folds: FoldState;
  readonly help: HelpState;
  readonly optionalFields: OptionalFieldState;
  /** Requests of confirmation made by the form, in their order. */
  readonly confirmations: LossRequest[];
  /** Paths of the fields to which the form was asked to move, in their order. */
  readonly reveals: YamlPath[];
}

/**
 * Renders the form of the instance at the vault path `path`, holding `text`, with the schemas
 * read from `files` and bound by `rules`. Each request of confirmation is recorded, and answered
 * by `confirm`. The schemas resolve absolute URIs through the registry that `settings` names, as
 * the plugin resolves them. The issues of `checkers`, when given, join the report as the form
 * service appends them in the plugin.
 */
export async function renderForm(
  files: FileSource,
  rules: readonly PathRule[],
  path: string,
  text: string,
  confirm = true,
  settings: Partial<EkphrasisSettings> = {},
  checkers: CustomCheckerService | null = null,
): Promise<RenderedForm> {
  const parser = new YamlDocumentParser();
  const current = (): EkphrasisSettings => ({ ...DEFAULT_SETTINGS, pathRules: rules, ...settings });
  const loader = new FileSchemaLoader(files, new RegistryReader(parser, files, current));
  const forms = new FormService(parser, loader, createValidation(), current, files, checkers);
  const commits = new CommitService(parser, new YamlSourceEditor(), createValidation());
  const registry = createDefaultRegistry();
  let rerender: ((ui: ComponentChild) => void) | null = null;
  const display = (): void => rerender?.(panel());
  const folds = new FoldState(display);
  const help = new HelpState(display);
  const optionalFields = new OptionalFieldState(display);
  const reveals: YamlPath[] = [];
  const session = new InstanceSession(forms, commits, { write: () => {}, changed: display });
  const confirmations: LossRequest[] = [];
  const panel = (): ComponentChild => (
    <FormPanel
      snapshot={session.snapshot}
      registry={registry}
      commit={(commit) => session.commit(commit)}
      commitAll={(edits) => session.commitAll(edits) !== "refused"}
      confirmLoss={(request) => {
        confirmations.push(request);
        return Promise.resolve(confirm);
      }}
      commitDelay={DEFAULT_SETTINGS.commitDelay}
      folds={folds}
      help={help}
      optionalFields={optionalFields}
      renderer={TEXT_RENDERER}
      scheduler={IMMEDIATE_SCHEDULER}
      paintIcon={NO_ICONS}
      reveal={(path) => reveals.push(path)}
      onOpenSource={() => undefined}
    />
  );
  session.setText(text);
  const result = render(<div />);
  rerender = result.rerender;
  await session.refresh(path);
  return {
    container: result.container,
    session,
    folds,
    help,
    optionalFields,
    confirmations,
    reveals,
  };
}

/** Element matching `selector` under `container`, or an error naming the selector. */
export function element<E extends Element = HTMLElement>(container: Element, selector: string): E {
  const found = container.querySelector<E>(selector);
  if (found === null) throw new Error(`No element matches ${selector}.`);
  return found;
}

/**
 * Elements of `container` through which the author can change the instance: a field of input,
 * enabled and not read-only; an enabled button adding, moving or removing an item or an entry;
 * and a rendered value whose activation opens its editor. A checkbox ignores `readOnly`, so only
 * its disabled state counts.
 */
export function editableControls(container: Element): Element[] {
  const fields = Array.from(
    container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    ),
  ).filter((control) => {
    if (control.disabled) return false;
    if (control instanceof HTMLSelectElement) return true;
    if (control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type)) {
      return true;
    }
    return !control.readOnly;
  });
  const actions = Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      "button.ekphrasis-add, button.ekphrasis-item-action",
    ),
  ).filter((button) => !button.disabled);
  const editors = Array.from(container.querySelectorAll('[role="button"][aria-label^="Edit "]'));
  return [...fields, ...actions, ...editors];
}

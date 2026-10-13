/**
 * Registry of controls: one Preact component per field kind, so that a new kind is added by
 * registering one component, without modifying the other controls.
 *
 * A kind without a registered component falls back to the generic component of its shape, so
 * every field displays, even before its dedicated control exists.
 */
import type { ComponentType } from "preact";
import {
  isMappingKind,
  isScalarKind,
  type FieldKind,
  type MappingField,
  type MappingKind,
  type ScalarField,
  type ScalarKind,
  type ScalarValue,
  type SequenceField,
  type SequenceKind,
} from "../../../domain";

export interface ControlProps<F> {
  readonly field: F;
  /** Whether the value must be displayed without being editable. */
  readonly readOnly: boolean;
}

export interface ScalarControlProps extends ControlProps<ScalarField> {
  /** Commits `value` at the field; the value `null` clears the field. */
  readonly onCommit: (value: ScalarValue) => void;
}

export type ScalarControl = ComponentType<ScalarControlProps>;
export type MappingControl = ComponentType<ControlProps<MappingField>>;
export type SequenceControl = ComponentType<ControlProps<SequenceField>>;

/** Components displaying the kinds that have no registered control. */
export interface FallbackControls {
  readonly scalar: ScalarControl;
  readonly mapping: MappingControl;
  readonly sequence: SequenceControl;
}

export class ControlRegistry {
  private readonly scalars = new Map<ScalarKind, ScalarControl>();
  private readonly mappings = new Map<MappingKind, MappingControl>();
  private readonly sequences = new Map<SequenceKind, SequenceControl>();

  constructor(private readonly fallbacks: FallbackControls) {}

  registerScalar(kinds: readonly ScalarKind[], control: ScalarControl): this {
    for (const kind of kinds) this.scalars.set(kind, control);
    return this;
  }

  registerMapping(kinds: readonly MappingKind[], control: MappingControl): this {
    for (const kind of kinds) this.mappings.set(kind, control);
    return this;
  }

  registerSequence(kinds: readonly SequenceKind[], control: SequenceControl): this {
    for (const kind of kinds) this.sequences.set(kind, control);
    return this;
  }

  scalar(kind: ScalarKind): ScalarControl {
    return this.scalars.get(kind) ?? this.fallbacks.scalar;
  }

  mapping(kind: MappingKind): MappingControl {
    return this.mappings.get(kind) ?? this.fallbacks.mapping;
  }

  sequence(kind: SequenceKind): SequenceControl {
    return this.sequences.get(kind) ?? this.fallbacks.sequence;
  }

  /** Whether `kind` has a control of its own rather than a fallback. */
  hasControl(kind: FieldKind): boolean {
    if (isScalarKind(kind)) return this.scalars.has(kind);
    if (isMappingKind(kind)) return this.mappings.has(kind);
    return this.sequences.has(kind);
  }
}

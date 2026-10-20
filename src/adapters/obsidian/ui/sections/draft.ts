/**
 * Draft of a new item or entry: the absent field displayed after a click on the button that adds
 * it. Nothing is written until a value inside the draft is committed; the commit inserts the item
 * or the entry, and the field built for it takes the key of the draft, so its control persists.
 */
import { useState } from "preact/hooks";

export interface Draft {
  /** Key of the draft displayed, or `null` when no draft is displayed. */
  readonly key: string | null;
  readonly open: (key: string) => void;
  readonly close: () => void;
}

export function useDraft(): Draft {
  const [key, setKey] = useState<string | null>(null);
  return { key, open: setKey, close: () => setKey(null) };
}

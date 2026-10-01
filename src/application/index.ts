/**
 * Public interface of the application layer.
 *
 * The application layer depends on the domain layer only; outer capabilities are consumed
 * through the ports declared in `protocols`.
 */
export type { DocumentParser, FileSource } from "./protocols";

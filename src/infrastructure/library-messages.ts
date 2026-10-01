/**
 * Adaptation of the messages of third-party libraries to the message convention of ekphrasis:
 * code, such as a path or a symbol, stands between backticks, so the interface displays it as
 * code.
 */

/**
 * A symbol quoted bare by a library, standing alone between spaces or at an end of the message,
 * as in "must end with a ]". The backtick is excluded, since it delimits code itself.
 */
const BARE_SYMBOL = /(^|\s)([[\]{}()<>,:;#&*!|?'"%@=+\\/~^-]{1,3})(?=\s|$)/g;

/**
 * Rewrites each bare symbol of `message` as code followed by the word "symbol", so the reader
 * does not take it for punctuation: "end with a ]" becomes "end with a `]` symbol".
 */
export function nameBareSymbols(message: string): string {
  return message.replace(
    BARE_SYMBOL,
    (_, space: string, symbol: string) => `${space}\`${symbol}\` symbol`,
  );
}

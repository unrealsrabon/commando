/**
 * POSIX shell quoting.
 *
 * The middle pane is a real interactive shell, so Run writes a command *line*.
 * We therefore quote values so spaces and special characters can never break the
 * command or inject extra tokens. Simple, safe values are left unquoted so the
 * live preview stays clean and human-readable.
 */

// Characters that are always safe unquoted in a POSIX shell word.
const SAFE = /^[A-Za-z0-9_@%+=:,.\/-]+$/;

export function needsQuote(value: string): boolean {
  return value.length === 0 || !SAFE.test(value);
}

/** Single-quote a value, escaping any embedded single quotes. */
export function forceQuote(value: string): string {
  return "'" + value.replace(/'/g, `'\\''`) + "'";
}

/** Quote only when necessary, keeping previews clean for ordinary inputs. */
export function shellQuote(value: string): string {
  return needsQuote(value) ? forceQuote(value) : value;
}

/** YYYY-MM-DD in the user's local calendar (for kill-switch / forms). */
export function localDateYMD(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA");
}

/** Normalize Obsidian-style #Tag and comma-separated input to stored tag name. */
export function normalizeTagName(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("#")) s = s.slice(1).trim();
  return s;
}

export function parseTagsFromInput(input: string): string[] {
  return input
    .split(",")
    .map((t) => normalizeTagName(t))
    .filter(Boolean);
}

const WIKI_LINK = /\[\[([^\]]+?)\]\]/g;

export function parseWikiTradeIds(text: string): string[] {
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK.source, WIKI_LINK.flags);
  while ((m = re.exec(text)) !== null) {
    const id = m[1].trim();
    if (id) ids.push(id);
  }
  return Array.from(new Set(ids));
}

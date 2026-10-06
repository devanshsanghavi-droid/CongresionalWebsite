/**
 * Carta's bundled content packs, parsed by Carta's own validating parser.
 *
 * The app loads these through src/lib/content/index.ts, which also loads the
 * form-check templates the web version does not use; this is the same two
 * calls without that import. The parser throws on any unsourced or malformed
 * rule, so a bad pack fails the build's tests rather than rendering.
 */

import timelinesRaw from '../carta/content/timelines.json';
import docTypesRaw from '../carta/content/doc_types.json';
import { parseDocTypes, parseTimelines } from '../carta/lib/content/parse.ts';
import type { DocTypesPack, TimelinesPack } from '../carta/lib/content/types.ts';
import { lookup } from './i18n.ts';
import type { Lang } from './i18n.ts';

export const timelines: TimelinesPack = parseTimelines(timelinesRaw);
export const docTypes: DocTypesPack = parseDocTypes(docTypesRaw);

/**
 * A document id read off a letter, as words. Carta's vocabulary resolves the
 * island's ids directly, including `lease_or_rent_receipt` through its alias
 * (fixed in the app at a2af242; this site used to carry its own mapping). An
 * id the vocabulary lacks is shown as it was read, never dropped.
 */
export function docLabel(id: string, lang: Lang): string {
  const type = docTypes.byId.get(id);
  if (type !== undefined) return lang === 'es' ? type.labelEs : type.label;
  const words = id.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The i18n key for a rule's `source_kind` ("state statute" -> web.sourceKind.state_statute). */
export const sourceKindKey = (kind: string): string =>
  `web.sourceKind.${kind.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;

/**
 * What kind of source a rule comes from, in the page's language. timelines.json
 * has these in English only; the Spanish is in i18n.ts (Carta's own). A kind
 * added to the pack later shows in English until it is translated, and
 * tests/i18n.test.ts fails until it is.
 */
export function sourceKindLabel(kind: string, lang: Lang): string {
  return lookup(lang, sourceKindKey(kind)) ?? kind;
}

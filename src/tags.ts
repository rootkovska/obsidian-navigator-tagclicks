/**
 * Pure helpers for recognising tag clicks in Obsidian's DOM and extracting the tag name.
 * Nothing here imports `obsidian`, so it can be unit-tested with plain jsdom.
 */

export type TagSource = 'rendered' | 'live-preview' | 'properties';

export interface TagClickOptions {
    /** `a.tag` links: reading view, plus callouts, tables, embeds and hover previews rendered inside the editor. */
    rendered: boolean;
    /** `.cm-hashtag` spans in the Live Preview editor. Source mode is never intercepted. */
    livePreview: boolean;
    /** Tag pills in the Properties panel (`tags` / `tag` property). */
    properties: boolean;
}

export interface TagHit {
    /** Tag without the leading `#`, e.g. `project/alpha`. */
    tag: string;
    source: TagSource;
}

/** View type registered by Notebook Navigator. Clicks inside its own view are never touched. */
export const NN_VIEW_TYPE = 'notebook-navigator';

const TAG_PROPERTY_KEYS = new Set(['tags', 'tag']);

// Characters that end a tag. Obsidian allows letters (any script), digits, `_`, `-`, `/` and emoji;
// whitespace and the remaining ASCII punctuation terminate it.
const TAG_BODY = String.raw`[^\s!"#$%&'()*+,.:;<=>?@\[\\\]^\x60{|}~]+`;
const TAG_BODY_RE = new RegExp(`^${TAG_BODY}$`, 'u');

/**
 * Normalise raw tag text (`#Project/Alpha`, ` project/alpha `) to `Project/Alpha`.
 * Returns null for anything that is not a plausible tag.
 */
export function normalizeTag(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim().replace(/^#/, '');
    if (!trimmed || !TAG_BODY_RE.test(trimmed)) return null;
    // Obsidian requires at least one non-digit character (`#123` is not a tag).
    if (/^[0-9/]+$/.test(trimmed)) return null;
    return trimmed;
}

/** True if this looks like a DOM Element. Avoids `instanceof`, which fails across pop-out windows. */
function asElement(target: EventTarget | null): Element | null {
    const node = target as (Node & Partial<Element>) | null;
    if (!node) return null;
    if (typeof node.closest === 'function') return node as Element;
    // A text node: use its parent element.
    const parent = (node as Node).parentElement;
    return parent ?? null;
}

function textOf(el: Element | null | undefined): string {
    return el?.textContent ?? '';
}

function fromPropertyPill(el: Element): string | null {
    const property = el.closest('.metadata-property');
    if (!property) return null;
    const key = (property.getAttribute('data-property-key') ?? '').toLowerCase();
    if (!TAG_PROPERTY_KEYS.has(key)) return null;

    const pill = el.closest('.multi-select-pill');
    if (!pill) return null;
    // Clicking the little "x" removes the tag; leave that alone.
    if (el.closest('.multi-select-pill-remove-button')) return null;

    const content = pill.querySelector('.multi-select-pill-content') ?? pill;
    return normalizeTag(textOf(content));
}

/**
 * Live Preview renders one tag as several adjacent spans, e.g.
 * `<span class="cm-hashtag cm-hashtag-begin">#</span><span class="cm-hashtag cm-hashtag-end">project/alpha</span>`.
 * Walk back to the first span and forward to the last, joining their text.
 */
function fromLivePreviewSpan(span: Element): string | null {
    let first: Element = span;
    while (!first.classList.contains('cm-hashtag-begin')) {
        const prev = first.previousElementSibling;
        if (!prev || !prev.classList.contains('cm-hashtag')) break;
        first = prev;
    }

    let text = '';
    let cur: Element | null = first;
    while (cur && cur.classList.contains('cm-hashtag')) {
        text += textOf(cur);
        if (cur.classList.contains('cm-hashtag-end')) break;
        cur = cur.nextElementSibling;
        if (cur?.classList.contains('cm-hashtag-begin')) break;
    }
    return normalizeTag(text);
}

/**
 * Work out whether a click landed on a tag we should handle and, if so, which tag.
 * Returns null when the click should be left to Obsidian.
 */
export function findClickedTag(target: EventTarget | null, options: TagClickOptions): TagHit | null {
    const el = asElement(target);
    if (!el) return null;

    // Never interfere with Notebook Navigator's own view.
    if (el.closest(`.workspace-leaf-content[data-type="${NN_VIEW_TYPE}"]`)) return null;

    if (el.closest('.metadata-property')) {
        if (!options.properties) return null;
        const tag = fromPropertyPill(el);
        return tag ? { tag, source: 'properties' } : null;
    }

    const link = el.closest('a.tag');
    if (link) {
        if (!options.rendered) return null;
        const tag = normalizeTag(textOf(link)) ?? normalizeTag(safeDecode(link.getAttribute('href')));
        return tag ? { tag, source: 'rendered' } : null;
    }

    const span = el.closest('.cm-hashtag');
    if (span) {
        if (!options.livePreview) return null;
        // In Source mode a click should just place the cursor.
        if (!span.closest('.markdown-source-view.is-live-preview')) return null;
        const tag = fromLivePreviewSpan(span);
        return tag ? { tag, source: 'live-preview' } : null;
    }

    return null;
}

function safeDecode(value: string | null): string | null {
    if (!value) return null;
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

const TAG_IN_TEXT_RE = new RegExp(`(^|[\\s(\\[{>"'])#(${TAG_BODY})`, 'gu');

/**
 * Find the tag that touches column `ch` of `line` (cursor anywhere from the `#` to just after the last character).
 * Used by the "reveal tag at cursor" command.
 */
export function tagAtPosition(line: string, ch: number): string | null {
    for (const match of line.matchAll(TAG_IN_TEXT_RE)) {
        const hashIndex = (match.index ?? 0) + match[1].length;
        const end = hashIndex + 1 + match[2].length;
        if (ch >= hashIndex && ch <= end) {
            return normalizeTag(match[2]);
        }
    }
    return null;
}

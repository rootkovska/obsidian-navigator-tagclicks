import { beforeEach, describe, expect, it } from 'vitest';
import { findClickedTag, normalizeTag, tagAtPosition } from '../../src/tags';
import { ALL_ON, insideNavigator, livePreview, mount, propertiesPanel, readingView, sourceMode } from './fixtures';

const $ = (sel: string) => document.querySelector(sel)!;

describe('normalizeTag', () => {
    it.each([
        ['#work', 'work'],
        ['work', 'work'],
        ['  #Project/Alpha ', 'Project/Alpha'],
        ['#café-notes_2', 'café-notes_2'],
        ['#日本語', '日本語'],
        ['#🚀launch', '🚀launch']
    ])('%s -> %s', (raw, expected) => expect(normalizeTag(raw)).toBe(expected));

    it.each(['', '#', '#123', '#two words', '#a.b', null, undefined])('rejects %s', raw => {
        expect(normalizeTag(raw as string)).toBeNull();
    });
});

describe('findClickedTag', () => {
    beforeEach(() => (document.body.innerHTML = ''));

    it('reading view link', () => {
        mount(readingView);
        expect(findClickedTag($('a.tag'), ALL_ON)).toEqual({ tag: 'project/alpha', source: 'rendered' });
    });

    it('accepts a text node target', () => {
        mount(readingView);
        expect(findClickedTag($('a.tag').firstChild, ALL_ON)?.tag).toBe('project/alpha');
    });

    it('live preview: clicking the # or the name gives the whole tag, not its neighbour', () => {
        mount(livePreview);
        expect(findClickedTag($('#begin'), ALL_ON)).toEqual({ tag: 'project/alpha', source: 'live-preview' });
        expect(findClickedTag($('#end'), ALL_ON)?.tag).toBe('project/alpha');
        expect(findClickedTag($('#e2'), ALL_ON)?.tag).toBe('other');
        expect(findClickedTag($('#plain'), ALL_ON)).toBeNull();
    });

    it('live preview: tag split into more than two spans', () => {
        mount(`<div class="markdown-source-view is-live-preview"><div class="cm-line">
          <span class="cm-hashtag cm-hashtag-begin">#</span><span class="cm-hashtag" id="mid">area</span><span class="cm-hashtag cm-hashtag-end">/sub</span></div></div>`);
        expect(findClickedTag($('#mid'), ALL_ON)?.tag).toBe('area/sub');
    });

    it('source mode is never intercepted', () => {
        mount(sourceMode);
        expect(findClickedTag($('#end'), ALL_ON)).toBeNull();
    });

    it('properties tag pill, but not its remove button or other list properties', () => {
        mount(propertiesPanel);
        expect(findClickedTag($('#pill-text'), ALL_ON)).toEqual({ tag: 'project/alpha', source: 'properties' });
        expect(findClickedTag($('#pill'), ALL_ON)?.tag).toBe('project/alpha');
        expect(findClickedTag($('#pill-remove'), ALL_ON)).toBeNull();
        expect(findClickedTag($('#pill-remove svg'), ALL_ON)).toBeNull();
        expect(findClickedTag($('#alias'), ALL_ON)).toBeNull();
    });

    it('ignores tags inside Notebook Navigator itself', () => {
        mount(insideNavigator);
        expect(findClickedTag($('#nn-tag'), ALL_ON)).toBeNull();
    });

    it('respects per-source switches', () => {
        mount(readingView + livePreview + propertiesPanel);
        const off = { rendered: false, livePreview: false, properties: false };
        expect(findClickedTag($('a.tag'), off)).toBeNull();
        expect(findClickedTag($('#end'), off)).toBeNull();
        expect(findClickedTag($('#pill-text'), off)).toBeNull();
    });

    it('null and non-element targets', () => {
        expect(findClickedTag(null, ALL_ON)).toBeNull();
        expect(findClickedTag(window, ALL_ON)).toBeNull();
    });
});

describe('tagAtPosition', () => {
    const line = 'Notes on #project/alpha and #beta, see (#gamma).';
    it.each([
        [9, 'project/alpha'], // on the #
        [15, 'project/alpha'],
        [23, 'project/alpha'], // just after the last character
        [29, 'beta'],
        [41, 'gamma'],
        [3, null],
        [25, null]
    ])('ch %i -> %s', (ch, expected) => expect(tagAtPosition(line, ch)).toBe(expected));

    it('ignores headings and anchors', () => {
        expect(tagAtPosition('# Heading', 0)).toBeNull();
        expect(tagAtPosition('[[Note#Section]]', 8)).toBeNull();
    });
});

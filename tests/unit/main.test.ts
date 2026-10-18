import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notices, Platform } from '../mocks/obsidian';
import NNTagClickPlugin from '../../src/main';
import { createFakeApp, type FakeAppOptions } from './fakeApp';
import { livePreview, mount, propertiesPanel, readingView, sourceMode } from './fixtures';

let plugin: NNTagClickPlugin | null = null;
/** Stands in for Obsidian's own (bubbling) tag click handler that opens core Search. */
const obsidianDefault = vi.fn();

async function setup(appOpts: FakeAppOptions = {}, data: unknown = null) {
    const fake = createFakeApp(appOpts);
    plugin = new NNTagClickPlugin(fake.app, {} as never);
    (plugin as unknown as { data: unknown }).data = data;
    await plugin.onload();
    return fake;
}

function click(sel: string, init: MouseEventInit = {}) {
    const el = document.querySelector(sel)!;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    el.dispatchEvent(evt);
    return evt;
}

/** Let the async reveal chain settle. */
const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
    notices.length = 0;
    obsidianDefault.mockReset();
    document.addEventListener('click', obsidianDefault);
});

afterEach(() => {
    (plugin as unknown as { unload(): void })?.unload();
    plugin = null;
    document.removeEventListener('click', obsidianDefault);
    document.body.innerHTML = '';
    Platform.isMobile = false;
});

describe('click interception', () => {
    it.each([
        ['reading view', readingView, 'a.tag'],
        ['live preview', livePreview, '#end'],
        ['properties', propertiesPanel, '#pill-text']
    ])('%s: claims the click and reveals the tag in NN', async (_name, html, sel) => {
        const { calls } = await setup();
        mount(html);
        const evt = click(sel);
        expect(evt.defaultPrevented).toBe(true);
        expect(obsidianDefault).not.toHaveBeenCalled();
        await flush();
        expect(calls).toEqual(['revealLeaf:nn-leaf', 'whenReady', 'navigateToTag:project/alpha']);
    });

    it('leaves source mode, non-tag clicks, right clicks and modifier clicks to Obsidian', async () => {
        const { calls } = await setup();
        mount(sourceMode);
        click('#end');
        mount(readingView);
        click('p');
        click('a.tag', { button: 2 });
        click('a.tag', { metaKey: true });
        click('a.tag', { ctrlKey: true });
        click('a.tag', { altKey: true });
        click('a.tag', { shiftKey: true });
        await flush();
        expect(obsidianDefault).toHaveBeenCalledTimes(7);
        expect(calls).toEqual([]);
    });

    it('handles modifier clicks too when pass-through is off', async () => {
        const { calls } = await setup({}, { modifierPassThrough: false });
        mount(readingView);
        expect(click('a.tag', { metaKey: true }).defaultPrevented).toBe(true);
        await flush();
        expect(calls).toContain('navigateToTag:project/alpha');
    });

    it('does nothing when Notebook Navigator is not enabled', async () => {
        await setup({ nnInstalled: false });
        mount(readingView);
        expect(click('a.tag').defaultPrevented).toBe(false);
        expect(obsidianDefault).toHaveBeenCalledTimes(1);
        expect(notices).toEqual([]);
    });

    it('respects disabled sources from saved settings', async () => {
        await setup({}, { rendered: false });
        mount(readingView);
        expect(click('a.tag').defaultPrevented).toBe(false);
    });

    it('stops listening after unload', async () => {
        await setup();
        (plugin as unknown as { unload(): void }).unload();
        mount(readingView);
        expect(click('a.tag').defaultPrevented).toBe(false);
    });

    it('also listens in pop-out windows', async () => {
        const { windowOpen } = await setup();
        const popout = document.implementation.createHTMLDocument('popout');
        windowOpen.forEach(cb => cb({}, { document: popout } as unknown as Window));
        popout.body.innerHTML = readingView;
        const evt = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        popout.querySelector('a.tag')!.dispatchEvent(evt);
        expect(evt.defaultPrevented).toBe(true);
    });
});

describe('fallback when NN does not have the tag', () => {
    it('opens core search by default', async () => {
        const { calls } = await setup({ navigateResult: false });
        mount(readingView);
        click('a.tag');
        await flush();
        expect(calls.at(-1)).toBe('search:tag:#project/alpha');
        expect(notices).toEqual([]);
    });

    it('shows a notice when configured, or when core search is off', async () => {
        await setup({ navigateResult: false }, { fallback: 'notice' });
        mount(readingView);
        click('a.tag');
        await flush();
        expect(notices[0]).toMatch(/#project\/alpha is not in Notebook Navigator/);
    });

    it('shows a notice when core search is disabled', async () => {
        await setup({ navigateResult: false, searchEnabled: false });
        mount(readingView);
        click('a.tag');
        await flush();
        expect(notices).toHaveLength(1);
    });
});

describe('mobile', () => {
    it('blurs the editor after revealing so the keyboard does not cover NN', async () => {
        Platform.isMobile = true;
        await setup();
        mount(livePreview);
        const content = document.querySelector<HTMLElement>('.cm-content')!;
        content.tabIndex = 0;
        content.focus();
        expect(document.activeElement).toBe(content);
        click('#end');
        await flush();
        expect(document.activeElement).not.toBe(content);
    });
});

describe('reveal-tag-at-cursor command', () => {
    it('is available only when the cursor is on a tag', async () => {
        const { calls } = await setup();
        const cmd = (plugin as unknown as { commands: { id: string; editorCheckCallback: (checking: boolean, editor: unknown) => boolean }[] }).commands[0];
        expect(cmd.id).toBe('reveal-tag-at-cursor');
        const editor = (ch: number) => ({ getCursor: () => ({ line: 0, ch }), getLine: () => 'x #work/q1 y' });
        expect(cmd.editorCheckCallback(true, editor(0))).toBe(false);
        expect(cmd.editorCheckCallback(true, editor(4))).toBe(true);
        cmd.editorCheckCallback(false, editor(4));
        await flush();
        expect(calls).toContain('navigateToTag:work/q1');
    });
});

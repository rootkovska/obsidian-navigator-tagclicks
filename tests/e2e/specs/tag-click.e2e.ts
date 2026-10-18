import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { ACTIVE, clickWithModifier, closeModals, inNote, isMobileRun, openNote, uiState, waitForSelectedTag } from '../helpers';

const SHIFT = '\uE008';
const CTRL = '\uE009';
const META = '\uE03D';

describe(`NN Tag Click (${isMobileRun ? 'mobile emulation' : 'desktop'})`, function () {
    before(async function () {
        await closeModals();
        const isMobile = await browser.executeObsidian(({ app }) => (app as unknown as { isMobile: boolean }).isMobile);
        expect(isMobile).toBe(isMobileRun);
        // Sanity: the vault is indexed and NN starts with only top-level tags visible (nothing expanded).
        await browser.waitUntil(async () => (await uiState()).visibleTags.includes('area'), { timeout: 15000 });
        const { visibleTags } = await uiState();
        expect(visibleTags).not.toContain('area/sub');
    });

    it('Live Preview: reveals hidden NN, selects the nested tag and expands its parents', async function () {
        await openNote('Tagged.md', 'live-preview');
        expect((await uiState()).leftCollapsed).toBe(true);

        await inNote('.markdown-source-view.is-live-preview .cm-hashtag-end.cm-tag-areasubleaf').click();

        const state = await waitForSelectedTag('area/sub/leaf');
        expect(state.leftCollapsed).toBe(false);
        expect(state.visibleTags).toEqual(expect.arrayContaining(['area', 'area/sub', 'area/sub/leaf']));
        expect(state.searchQuery ?? '').toBe(''); // core Search did not open
        if (isMobileRun) expect(state.editorFocused).toBe(false); // keyboard would cover NN
    });

    it('Live Preview: clicking the "#" part works too', async function () {
        await openNote('Tagged.md', 'live-preview');
        await inNote('.markdown-source-view.is-live-preview .cm-hashtag-begin.cm-tag-flat').click();
        await waitForSelectedTag('flat');
    });

    it('Live Preview: tag inside a rendered callout', async function () {
        await openNote('Tagged.md', 'live-preview');
        await inNote('.cm-callout a.tag[href="#callout/inside"]').click();
        await waitForSelectedTag('callout/inside');
    });

    it('Reading view: reveals the tag', async function () {
        await openNote('Other.md', 'reading');
        await inNote('.markdown-reading-view a.tag[href="#zeta"]').click();
        const state = await waitForSelectedTag('zeta');
        expect(state.searchQuery ?? '').toBe('');
    });

    it('Properties panel: tag pill reveals the tag (and expands its parent)', async function () {
        await openNote('Tagged.md', 'live-preview');
        await inNote('.metadata-property[data-property-key="tags"] .multi-select-pill-content').click();
        const state = await waitForSelectedTag('props/only');
        expect(state.visibleTags).toEqual(expect.arrayContaining(['props', 'props/only']));
        expect(state.searchQuery ?? '').toBe('');
    });

    it('Reveals NN when it sits in a background sidebar tab', async function () {
        await openNote('Tagged.md', 'live-preview');
        // Put the core file explorer in front of NN in the same sidebar tab group.
        await browser.executeObsidian(async ({ app }) => {
            const nnLeaf = app.workspace.getLeavesOfType('notebook-navigator')[0];
            const group = nnLeaf.parent as unknown as { children: unknown[] };
            const other = app.workspace.createLeafInParent(nnLeaf.parent as never, group.children.length);
            await other.setViewState({ type: 'file-explorer', active: false });
            app.workspace.leftSplit.expand();
            await app.workspace.revealLeaf(other);
            app.workspace.leftSplit.collapse();
        });
        expect((await uiState()).nnVisible).toBe(false);

        await inNote('.cm-hashtag-end.cm-tag-areasubleaf').click();
        await waitForSelectedTag('area/sub/leaf');
    });

    it('Source mode is left alone (click just places the cursor)', async function () {
        await openNote('Other.md', 'source');
        const before = await uiState();
        await inNote('.markdown-source-view:not(.is-live-preview) .cm-hashtag-end.cm-tag-zeta').click();
        await browser.pause(1000);
        const after = await uiState();
        expect(after.leftCollapsed).toBe(true);
        expect(after.selectedTag).toBe(before.selectedTag);
    });

    it('Ctrl/Cmd-click falls through to Obsidian (core Search)', async function () {
        if (isMobileRun) this.skip(); // no modifier keys on a touch screen
        await openNote('Other.md', 'live-preview');
        const before = await uiState();
        await clickWithModifier(ACTIVE + ' .cm-hashtag-end.cm-tag-zeta', process.platform === 'darwin' ? META : CTRL);
        await browser.waitUntil(async () => (await uiState()).searchQuery === 'tag:#zeta', {
            timeout: 5000,
            timeoutMsg: 'core Search did not open on Ctrl/Cmd-click'
        });
        expect((await uiState()).selectedTag).toBe(before.selectedTag);
    });

    it('Shift-click in Live Preview keeps its editor meaning (neither NN nor Search)', async function () {
        if (isMobileRun) this.skip();
        await openNote('Other.md', 'live-preview');
        const before = await uiState();
        await clickWithModifier(ACTIVE + ' .cm-hashtag-end.cm-tag-zeta', SHIFT);
        await browser.pause(1000);
        const after = await uiState();
        expect(after.leftCollapsed).toBe(true);
        expect(after.selectedTag).toBe(before.selectedTag);
        expect(after.searchQuery ?? '').toBe('');
    });

    it('Falls back to core Search when NN does not have the tag', async function () {
        await openNote('Other.md', 'live-preview');
        const result = await browser.executeObsidian(async ({ app }) => {
            const plugin = (app as unknown as { plugins: { plugins: Record<string, { reveal(h: object): Promise<string> }> } })
                .plugins.plugins['nn-tag-click'];
            return plugin.reveal({ tag: 'not-in-vault', source: 'rendered' });
        });
        expect(result).toBe('not-found');
        await browser.waitUntil(async () => (await uiState()).searchQuery === 'tag:#not-in-vault', { timeout: 5000 });
    });

    it('Command "Reveal tag at cursor" works', async function () {
        await openNote('Tagged.md', 'live-preview');
        await browser.executeObsidian(({ app }) => {
            const editor = app.workspace.activeEditor!.editor!;
            const lineNo = editor.getValue().split('\n').findIndex(l => l.includes('#flat'));
            editor.setCursor({ line: lineNo, ch: editor.getLine(lineNo).indexOf('#flat') + 2 });
        });
        await browser.executeObsidianCommand('nn-tag-click:reveal-tag-at-cursor');
        await waitForSelectedTag('flat');
    });

    it('Without the plugin, Obsidian opens core Search (the behaviour we replace)', async function () {
        await obsidianPage.disablePlugin('nn-tag-click');
        try {
            await openNote('Other.md', 'live-preview');
            await inNote('.cm-hashtag-end.cm-tag-zeta').click();
            await browser.waitUntil(async () => (await uiState()).searchQuery === 'tag:#zeta', { timeout: 5000 });
        } finally {
            await obsidianPage.enablePlugin('nn-tag-click');
        }
    });

    it("NN's own navigateToTag does not reveal an existing hidden NN view (why we call revealLeaf)", async function () {
        await openNote('Other.md', 'live-preview');
        const ok = await browser.executeObsidian(async ({ app }) => {
            const api = (app as unknown as { plugins: { plugins: Record<string, { api: any }> } }).plugins.plugins['notebook-navigator'].api; // eslint-disable-line @typescript-eslint/no-explicit-any
            await api.whenReady();
            return api.navigation.navigateToTag('#zeta');
        });
        expect(ok).toBe(true);
        const state = await uiState();
        expect(state.leftCollapsed).toBe(true);
    });
});

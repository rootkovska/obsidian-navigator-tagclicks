import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

export const isMobileRun = process.env.NN_E2E_MOBILE === '1';

/** The note's tab. Background tabs keep their DOM, so selectors must be scoped to the active one. */
export const ACTIVE = '.workspace-leaf.mod-active';

/** Find an element inside the active note. */
export function inNote(selector: string) {
    return browser.$(`${ACTIVE} ${selector}`);
}

/** Close any modal (e.g. Notebook Navigator's first-launch welcome dialog). */
export async function closeModals(): Promise<void> {
    // The welcome modal opens asynchronously after layout-ready; give it a moment to appear.
    await browser.pause(1500);
    for (let i = 0; i < 5; i++) {
        const open = await browser.execute(() => document.querySelectorAll('.modal-container').length);
        if (!open) return;
        await browser.keys('Escape');
        await browser.pause(300);
    }
    throw new Error('Could not close modals');
}

/** Open a note in the given mode and hide Notebook Navigator (collapsed sidebar / closed drawer). */
export async function openNote(file: string, mode: 'live-preview' | 'source' | 'reading'): Promise<void> {
    await obsidianPage.openFile(file);
    await browser.executeObsidian(async ({ app }, mode) => {
        const leaf = app.workspace.getMostRecentLeaf()!;
        const state = leaf.getViewState();
        await leaf.setViewState({
            ...state,
            state: { ...state.state, mode: mode === 'reading' ? 'preview' : 'source', source: mode === 'source' }
        });
        app.workspace.setActiveLeaf(leaf, { focus: true });
        // Reset core Search so we can tell whether a click opened it.
        const search = app.workspace.getLeavesOfType('search')[0]?.view as { setQuery?(q: string): void } | undefined;
        search?.setQuery?.('');
        app.workspace.leftSplit.collapse();
    }, mode);
    await browser.pause(500);
}

export interface UiState {
    selectedTag: string | null;
    /** The selected tag's row is actually on screen (not just in the DOM of a hidden pane). */
    selectedTagOnScreen: boolean;
    editorFocused: boolean;
    visibleTags: string[];
    leftCollapsed: boolean;
    nnVisible: boolean;
    searchQuery: string | null;
}

export async function uiState(): Promise<UiState> {
    return browser.executeObsidian(({ app }) => {
        const nnLeaf = app.workspace.getLeavesOfType('notebook-navigator')[0];
        const nnEl = (nnLeaf?.view as { containerEl?: HTMLElement } | undefined)?.containerEl;
        const search = app.workspace.getLeavesOfType('search')[0]?.view as { getQuery?(): string } | undefined;
        const selected = document.querySelector<HTMLElement>('.nn-tag.nn-selected');
        const onScreen = (el: HTMLElement | null) => {
            if (!el || !el.isShown()) return false;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !!hit && (el === hit || el.contains(hit));
        };
        return {
            selectedTag: selected?.getAttribute('data-tag') ?? null,
            selectedTagOnScreen: onScreen(selected),
            editorFocused: !!document.activeElement?.closest('.cm-content'),
            visibleTags: Array.from(document.querySelectorAll('.nn-tag')).map(e => e.getAttribute('data-tag') ?? ''),
            leftCollapsed: app.workspace.leftSplit.collapsed,
            nnVisible: !!nnEl && nnEl.isShown() && nnEl.getBoundingClientRect().width > 0,
            searchQuery: search?.getQuery?.() ?? null
        };
    });
}

/** Wait until NN shows `tag` as selected, then return the UI state. */
export async function waitForSelectedTag(tag: string): Promise<UiState> {
    let last: UiState | undefined;
    await browser.waitUntil(
        async () => {
            last = await uiState();
            return last.selectedTag === tag && last.nnVisible && last.selectedTagOnScreen;
        },
        { timeout: 10000, timeoutMsg: `NN never showed #${tag} selected` }
    );
    return last!;
}

/** Click an element while holding a modifier key, using real WebDriver input (not a synthetic event). */
export async function clickWithModifier(selector: string, key: string): Promise<void> {
    const el = await browser.$(selector);
    await el.scrollIntoView();
    await browser.performActions([
        { type: 'key', id: 'kbd', actions: [{ type: 'keyDown', value: key }, { type: 'pause', duration: 50 }, { type: 'pause', duration: 50 }, { type: 'pause', duration: 50 }, { type: 'keyUp', value: key }] },
        {
            type: 'pointer',
            id: 'mouse',
            parameters: { pointerType: 'mouse' },
            actions: [
                { type: 'pointerMove', origin: el, x: 0, y: 0 },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerUp', button: 0 },
                { type: 'pause', duration: 0 }
            ]
        }
    ]);
    await browser.releaseActions();
}

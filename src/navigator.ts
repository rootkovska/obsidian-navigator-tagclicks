import type { App, WorkspaceLeaf } from 'obsidian';
import { NN_VIEW_TYPE } from './tags';

export const NN_PLUGIN_ID = 'notebook-navigator';

/** The slice of Notebook Navigator's public API (v1.2+) that we use. */
export interface NotebookNavigatorApi {
    whenReady(): Promise<void>;
    navigation: {
        navigateToTag(tag: string): Promise<boolean>;
    };
}

interface AppWithPlugins {
    plugins?: { plugins?: Record<string, { api?: unknown } | undefined> };
    internalPlugins?: {
        getPluginById?(id: string): { enabled?: boolean; instance?: { openGlobalSearch?(query: string): void } } | null;
    };
}

/**
 * Returns NN's API if Notebook Navigator is installed, enabled, and new enough to have `navigateToTag`.
 * Synchronous on purpose: the click handler must decide before the event finishes whether to take over.
 */
export function getNavigatorApi(app: App): NotebookNavigatorApi | null {
    const api = (app as unknown as AppWithPlugins).plugins?.plugins?.[NN_PLUGIN_ID]?.api as
        | Partial<NotebookNavigatorApi>
        | undefined;
    if (!api || typeof api.whenReady !== 'function' || typeof api.navigation?.navigateToTag !== 'function') {
        return null;
    }
    return api as NotebookNavigatorApi;
}

export type RevealResult = 'revealed' | 'not-found' | 'unavailable' | 'error';

/**
 * Show Notebook Navigator and select `tag` in its tag tree, expanding parent tags.
 *
 * `navigateToTag` creates and reveals the NN view only when none exists. If NN is already open
 * but hidden (collapsed sidebar, closed mobile drawer, background tab, or deferred after startup),
 * it selects the tag without showing it. So we reveal the existing leaf ourselves first.
 */
export async function revealTagInNavigator(app: App, tag: string): Promise<RevealResult> {
    const api = getNavigatorApi(app);
    if (!api) return 'unavailable';

    try {
        const leaf: WorkspaceLeaf | undefined = app.workspace.getLeavesOfType(NN_VIEW_TYPE)[0];
        if (leaf) {
            await app.workspace.revealLeaf(leaf);
        }
        await api.whenReady();
        const ok = await api.navigation.navigateToTag(tag);
        return ok ? 'revealed' : 'not-found';
    } catch (error) {
        console.error('[nn-tag-click] Failed to reveal tag in Notebook Navigator', error);
        return 'error';
    }
}

/** Open Obsidian's core Search pane with `tag:#tag`. Returns false if core Search is disabled. */
export function openCoreTagSearch(app: App, tag: string): boolean {
    const search = (app as unknown as AppWithPlugins).internalPlugins?.getPluginById?.('global-search');
    const open = search?.instance?.openGlobalSearch;
    if (!search?.enabled || typeof open !== 'function') return false;
    open.call(search.instance, `tag:#${tag}`);
    return true;
}

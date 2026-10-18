/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

export interface FakeAppOptions {
    nnInstalled?: boolean;
    nnLeafExists?: boolean;
    navigateResult?: boolean | Error;
    searchEnabled?: boolean;
}

/** A fake `app` that records the order of calls to the workspace and NN. */
export function createFakeApp(opts: FakeAppOptions = {}) {
    const { nnInstalled = true, nnLeafExists = true, navigateResult = true, searchEnabled = true } = opts;
    const calls: string[] = [];
    const leaf = { id: 'nn-leaf' };
    const windowOpen: ((win: any, w: Window) => void)[] = [];

    const api = {
        whenReady: vi.fn(async () => {
            calls.push('whenReady');
        }),
        navigation: {
            navigateToTag: vi.fn(async (tag: string) => {
                calls.push(`navigateToTag:${tag}`);
                if (navigateResult instanceof Error) throw navigateResult;
                return navigateResult;
            })
        }
    };
    const openGlobalSearch = vi.fn((q: string) => calls.push(`search:${q}`));

    const app = {
        plugins: { plugins: nnInstalled ? { 'notebook-navigator': { api } } : {} },
        internalPlugins: {
            getPluginById: (id: string) =>
                id === 'global-search' ? { enabled: searchEnabled, instance: { openGlobalSearch } } : null
        },
        workspace: {
            getLeavesOfType: vi.fn((type: string) => (type === 'notebook-navigator' && nnLeafExists ? [leaf] : [])),
            revealLeaf: vi.fn(async (l: unknown) => {
                calls.push(`revealLeaf:${(l as typeof leaf).id}`);
            }),
            on: vi.fn((name: string, cb: any) => {
                if (name === 'window-open') windowOpen.push(cb);
                return { name };
            })
        }
    };

    return { app: app as any, api, calls, leaf, openGlobalSearch, windowOpen };
}

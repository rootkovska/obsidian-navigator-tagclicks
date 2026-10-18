import { describe, expect, it, vi } from 'vitest';
import { getNavigatorApi, openCoreTagSearch, revealTagInNavigator } from '../../src/navigator';
import { createFakeApp } from './fakeApp';

describe('getNavigatorApi', () => {
    it('returns the API when NN is enabled', () => {
        const { app, api } = createFakeApp();
        expect(getNavigatorApi(app)).toBe(api);
    });

    it('returns null when NN is missing, disabled, or too old', () => {
        expect(getNavigatorApi(createFakeApp({ nnInstalled: false }).app)).toBeNull();
        expect(getNavigatorApi({} as never)).toBeNull();
        const old = { plugins: { plugins: { 'notebook-navigator': { api: { whenReady: async () => {}, navigation: {} } } } } };
        expect(getNavigatorApi(old as never)).toBeNull();
    });
});

describe('revealTagInNavigator', () => {
    it('reveals the existing NN leaf, waits for storage, then selects the tag', async () => {
        const { app, calls } = createFakeApp();
        expect(await revealTagInNavigator(app, 'project/alpha')).toBe('revealed');
        expect(calls).toEqual(['revealLeaf:nn-leaf', 'whenReady', 'navigateToTag:project/alpha']);
    });

    it('lets navigateToTag create the view when no NN leaf exists', async () => {
        const { app, calls } = createFakeApp({ nnLeafExists: false });
        expect(await revealTagInNavigator(app, 'work')).toBe('revealed');
        expect(calls).toEqual(['whenReady', 'navigateToTag:work']);
    });

    it('reports not-found when NN does not have the tag', async () => {
        const { app } = createFakeApp({ navigateResult: false });
        expect(await revealTagInNavigator(app, 'hidden')).toBe('not-found');
    });

    it('reports unavailable without NN', async () => {
        const { app, calls } = createFakeApp({ nnInstalled: false });
        expect(await revealTagInNavigator(app, 'x')).toBe('unavailable');
        expect(calls).toEqual([]);
    });

    it('reports error and logs when NN throws', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { app } = createFakeApp({ navigateResult: new Error('boom') });
        expect(await revealTagInNavigator(app, 'x')).toBe('error');
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});

describe('openCoreTagSearch', () => {
    it('opens core search with a tag query', () => {
        const { app, openGlobalSearch } = createFakeApp();
        expect(openCoreTagSearch(app, 'a/b')).toBe(true);
        expect(openGlobalSearch).toHaveBeenCalledWith('tag:#a/b');
    });

    it('returns false when core search is disabled', () => {
        const { app, openGlobalSearch } = createFakeApp({ searchEnabled: false });
        expect(openCoreTagSearch(app, 'a')).toBe(false);
        expect(openGlobalSearch).not.toHaveBeenCalled();
    });
});

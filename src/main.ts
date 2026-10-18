import { Editor, Notice, Platform, Plugin } from 'obsidian';
import { getNavigatorApi, openCoreTagSearch, revealTagInNavigator, type RevealResult } from './navigator';
import { DEFAULT_SETTINGS, NNTagClickSettingTab, type NNTagClickSettings } from './settings';
import { findClickedTag, tagAtPosition, type TagHit } from './tags';

/**
 * Should we take this click? Left button only.
 * Shift and Alt always pass through: in the editor they extend the selection / add a cursor.
 * Cmd/Ctrl pass through (to Obsidian's core Search) unless the user turned that off.
 */
export function isPlainLeftClick(evt: MouseEvent, modifierPassThrough: boolean): boolean {
    if (evt.button !== 0) return false;
    if (evt.shiftKey || evt.altKey) return false;
    if (modifierPassThrough && (evt.metaKey || evt.ctrlKey)) return false;
    return true;
}

export default class NNTagClickPlugin extends Plugin {
    settings: NNTagClickSettings = { ...DEFAULT_SETTINGS };

    async onload(): Promise<void> {
        await this.loadSettings();
        this.addSettingTab(new NNTagClickSettingTab(this.app, this));

        // Capture phase on the document runs before Obsidian's own tag click handling,
        // so we can claim the click before core Search opens.
        this.registerDomEvent(document, 'click', this.onClick, { capture: true });
        // Pop-out windows have their own document.
        this.registerEvent(
            this.app.workspace.on('window-open', (_win, win) => {
                this.registerDomEvent(win.document, 'click', this.onClick, { capture: true });
            })
        );

        this.addCommand({
            id: 'reveal-tag-at-cursor',
            name: 'Reveal tag at cursor in Notebook Navigator',
            editorCheckCallback: (checking: boolean, editor: Editor) => {
                const cursor = editor.getCursor();
                const tag = tagAtPosition(editor.getLine(cursor.line), cursor.ch);
                if (!tag) return false;
                if (!checking) void this.reveal({ tag, source: 'live-preview' });
                return true;
            }
        });
    }

    /** Arrow function so the same reference can be registered on several documents. */
    readonly onClick = (evt: MouseEvent): void => {
        if (evt.defaultPrevented) return;
        if (!isPlainLeftClick(evt, this.settings.modifierPassThrough)) return;

        const hit = findClickedTag(evt.target, this.settings);
        if (!hit) return;

        // If Notebook Navigator isn't available, leave Obsidian's default behaviour alone.
        if (!getNavigatorApi(this.app)) return;

        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        void this.reveal(hit);
    };

    async reveal(hit: TagHit): Promise<RevealResult> {
        const result = await revealTagInNavigator(this.app, hit.tag);
        if (result === 'revealed') {
            this.dismissMobileKeyboard();
            return result;
        }

        if (result === 'not-found' && this.settings.fallback === 'search' && openCoreTagSearch(this.app, hit.tag)) {
            return result;
        }

        const message =
            result === 'not-found'
                ? `#${hit.tag} is not in Notebook Navigator's tag tree. It may be hidden there.`
                : result === 'unavailable'
                  ? 'Notebook Navigator is not enabled.'
                  : `Could not reveal #${hit.tag} in Notebook Navigator. See the developer console for details.`;
        new Notice(message);
        return result;
    }

    /** On phones/tablets, tapping a tag in the editor focuses it and pops up the keyboard over NN. */
    private dismissMobileKeyboard(): void {
        if (!Platform.isMobile) return;
        const active = document.activeElement as HTMLElement | null;
        if (active?.closest?.('.cm-content')) active.blur();
    }

    async loadSettings(): Promise<void> {
        this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<NNTagClickSettings> | null) };
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}

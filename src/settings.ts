import { App, PluginSettingTab, Setting } from 'obsidian';
import type NNTagClickPlugin from './main';

export type FallbackMode = 'search' | 'notice';

export interface NNTagClickSettings {
    rendered: boolean;
    livePreview: boolean;
    properties: boolean;
    /** Clicks with Cmd/Ctrl/Alt/Shift held fall through to Obsidian's default (core Search). */
    modifierPassThrough: boolean;
    /** What to do when Notebook Navigator can't find the tag (e.g. it is hidden in NN). */
    fallback: FallbackMode;
}

export const DEFAULT_SETTINGS: NNTagClickSettings = {
    rendered: true,
    livePreview: true,
    properties: true,
    modifierPassThrough: true,
    fallback: 'search'
};

export class NNTagClickSettingTab extends PluginSettingTab {
    constructor(
        app: App,
        private plugin: NNTagClickPlugin
    ) {
        super(app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const toggle = (name: string, desc: string, key: 'rendered' | 'livePreview' | 'properties' | 'modifierPassThrough') =>
            new Setting(containerEl)
                .setName(name)
                .setDesc(desc)
                .addToggle(t =>
                    t.setValue(this.plugin.settings[key]).onChange(async value => {
                        this.plugin.settings[key] = value;
                        await this.plugin.saveSettings();
                    })
                );

        toggle('Reading view tags', 'Tags in Reading view, plus callouts, tables, embeds and hover previews.', 'rendered');
        toggle('Live Preview tags', 'Tags in the Live Preview editor. Source mode is never affected.', 'livePreview');
        toggle('Properties tags', 'Tag pills in the Properties panel.', 'properties');
        toggle(
            'Modifier key opens Search',
            "Hold Cmd, Ctrl, Alt or Shift while clicking to get Obsidian's default behaviour (core Search) instead.",
            'modifierPassThrough'
        );

        new Setting(containerEl)
            .setName('If the tag is not in Notebook Navigator')
            .setDesc('For example, when the tag is hidden in Notebook Navigator or tags are turned off there.')
            .addDropdown(d =>
                d
                    .addOption('search', 'Open core Search')
                    .addOption('notice', 'Show a notice')
                    .setValue(this.plugin.settings.fallback)
                    .onChange(async value => {
                        this.plugin.settings.fallback = value as FallbackMode;
                        await this.plugin.saveSettings();
                    })
            );
    }
}

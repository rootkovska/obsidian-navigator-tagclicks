/** Minimal stand-in for the `obsidian` module (which only exists inside the app). */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const Platform = { isMobile: false, isDesktop: true };

export const notices: string[] = [];
export class Notice {
    constructor(message: string) {
        notices.push(message);
    }
}

type Listener = { el: EventTarget; type: string; cb: any; options: any };

export class Plugin {
    app: any;
    manifest: any;
    data: unknown = null;
    domListeners: Listener[] = [];
    commands: any[] = [];
    settingTabs: any[] = [];
    eventRefs: unknown[] = [];

    constructor(app: any, manifest: any = {}) {
        this.app = app;
        this.manifest = manifest;
    }
    registerDomEvent(el: EventTarget, type: string, cb: any, options?: any) {
        el.addEventListener(type, cb, options);
        this.domListeners.push({ el, type, cb, options });
    }
    registerEvent(ref: unknown) {
        this.eventRefs.push(ref);
    }
    addCommand(cmd: any) {
        this.commands.push(cmd);
        return cmd;
    }
    addSettingTab(tab: any) {
        this.settingTabs.push(tab);
    }
    async loadData() {
        return this.data;
    }
    async saveData(data: unknown) {
        this.data = data;
    }
    /** Test helper: remove every DOM listener, like Obsidian does on unload. */
    unload() {
        for (const l of this.domListeners) l.el.removeEventListener(l.type, l.cb, l.options);
        this.domListeners = [];
    }
}

export class PluginSettingTab {
    containerEl: any = { empty() {} };
    constructor(
        public app: any,
        public plugin: any
    ) {}
}

export class Setting {
    constructor(public el: unknown) {}
    setName() {
        return this;
    }
    setDesc() {
        return this;
    }
    addToggle() {
        return this;
    }
    addDropdown() {
        return this;
    }
}

export type App = any;
export type Editor = any;
export type WorkspaceLeaf = any;

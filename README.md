# NN Tag Click

An Obsidian plugin. When you click a tag in a note, [Notebook Navigator](https://github.com/johansan/notebook-navigator) (NN) opens, selects that tag in its tag tree and expands the tag's parents. Without the plugin, Obsidian opens the core Search pane.

Works on desktop, iPhone and iPad (`isDesktopOnly: false`, no Node or Electron APIs).

NN deliberately leaves this to other plugins. Its wiki lists "Click tag in editor to reveal in Notebook Navigator" under *Obsidian Editor Integration (Out of Scope)* ([issue #177](https://github.com/johansan/notebook-navigator/issues/177)).

## What gets handled

| You click… | Result |
| --- | --- |
| A tag in **Live Preview** (the `#` or the name) | NN shows it |
| A tag in **Reading view**, or in a callout, table, embed or hover preview | NN shows it |
| A tag pill in the **Properties** panel (`tags` property) | NN shows it (the pill's × still removes the tag) |
| A tag in **Source mode** | Left alone: the cursor moves there, as usual |
| **Cmd-click** (macOS) / **Ctrl-click** | Obsidian's core Search, as before (can be turned off) |
| **Shift-click / Alt-click** | Left alone: extends the selection or adds a cursor in the editor |
| A tag NN doesn't have (for example, one you hid in NN) | Falls back to core Search, or shows a notice (your choice) |
| Anything, while NN is disabled | Obsidian's normal behaviour |

There is also a command, **Reveal tag at cursor in Notebook Navigator**, which you can bind to a hotkey or add to the mobile toolbar.

If NN is hidden, the plugin brings it to the front first: collapsed sidebar, closed mobile drawer, or another tab in front of it in the same sidebar.

## Installing

The plugin isn't in the community store. Install it once on your Mac and let Obsidian Sync copy it to your other devices.

1. Build it (`npm ci && npm run build`), or download `main.js` and `manifest.json` from a GitHub release.
2. Create `<your vault>/.obsidian/plugins/nn-tag-click/` and copy `main.js` and `manifest.json` into it.
3. In Obsidian go to **Settings → Community plugins**, reload the list, and enable **NN Tag Click**.
4. For iOS/iPadOS: in **Settings → Sync**, turn on **Installed community plugins** and **Active community plugin list** (on every device). After a sync, the plugin appears and is enabled on the phone and tablet.

You can also use [BRAT](https://github.com/TfTHacker/obsidian42-brat) with this repo. Pushing a tag that matches the manifest version (e.g. `0.1.0`) makes the Release workflow publish the files.

## Settings

- **Reading view tags / Live Preview tags / Properties tags**: turn each source on or off.
- **Cmd/Ctrl-click opens Search**: on by default.
- **If the tag is not in Notebook Navigator**: open core Search (default) or show a notice.

## How it works

A capture-phase `click` listener on each window's `document` (main window and pop-outs) runs before Obsidian's own tag handling. This is the same technique TagFolder and Tag Wrangler use. When the click lands on a tag and NN is enabled, the plugin cancels the event, then:

1. reveals NN's existing view with `app.workspace.revealLeaf()`, if there is one;
2. waits for NN's storage: `await nn.whenReady()`;
3. calls `nn.navigation.navigateToTag(tag)`, which selects the tag and expands its parents;
4. if NN returns `false`, runs the fallback.

All of this is in `src/` (about 300 lines).

### Notes on NN's API (checked against NN 3.4.3, API 2.0.0)

The background research was correct. Checking NN's [API reference](https://github.com/johansan/notebook-navigator/blob/main/docs/api-reference.md) and source (`src/api/modules/NavigationAPI.ts`) added these details:

- **Tag format:** `navigateToTag` accepts `'work'` and `'#work'`. NN normalises case and the `#` itself.
- **It expands parents:** yes. For `a/b/c` it expands `a` and `a/b`, and also the "Tags" root if that is collapsed. The e2e tests confirm this.
- **It does not always show the view:** it creates and reveals NN's view only when **no NN view exists**. If NN is already open but hidden (collapsed sidebar, closed mobile drawer, background tab), it selects the tag without bringing NN to the front. That's why this plugin calls `revealLeaf` first. One e2e test checks NN's behaviour directly, so we'll notice if NN changes it.
- **`navigateToTag` returns `false`** if the tag is not in NN's tag tree (for example, hidden tags, or tags turned off in NN). That's when the fallback runs.
- **`notebook-navigator:open`** exists, but it doesn't return a promise you can await, so the plugin calls `revealLeaf` directly instead.
- **Version:** `navigateToTag` arrived in NN API 1.2.0. With an older NN, the plugin stays out of the way.

## Development

```sh
npm ci
npm run dev           # rebuild main.js on change
npm run check         # typecheck + lint + unit tests + production build
npm run test:e2e      # real Obsidian + real Notebook Navigator (downloads both on first run)
npm run test:e2e:mobile   # same specs in Obsidian's mobile UI emulation
```

On Linux without a display, prefix the e2e commands with `xvfb-run -a`.

### Tests

- **Unit tests** (`tests/unit`, Vitest + jsdom, 53 tests) cover:
  - extracting the tag from Obsidian-shaped DOM (Live Preview's split `#`/name spans, Reading view links, Properties pills, the × button, NN's own view, Source mode);
  - modifier keys, settings, the fallbacks and pop-out windows;
  - the order of calls to NN (reveal → `whenReady` → `navigateToTag`).
- **End-to-end tests** (`tests/e2e`, [wdio-obsidian-service](https://github.com/jesse-r-s-hines/wdio-obsidian-service)) start the real Obsidian app with this plugin and Notebook Navigator from the community store. They click real tags in a small test vault, with NN hidden before each click. They then check that NN is visible, the right tag row is selected and on screen, its parents are expanded, and core Search did not open. They run on desktop and in Obsidian's mobile emulation, and CI runs both.
- **Manual tests**: there's no automated testing on iOS, so [docs/manual-testing.md](docs/manual-testing.md) has a short checklist for macOS, iPhone and iPad.

## License

MIT

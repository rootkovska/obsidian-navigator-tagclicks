# Manual test procedure

The automated tests cover Obsidian desktop and its mobile UI emulation. This checklist covers what they can't: the real iOS/iPadOS app, touch input, the on-screen keyboard, Obsidian Sync, and your own vault and NN settings.

It takes about 10 minutes per device.

## Setup

1. On the Mac, install the plugin (see the README) and enable it.
2. Create a note `NN Tag Click test.md`:

   ```markdown
   ---
   tags:
     - nntest/props
   ---
   # NN Tag Click test

   Nested: #nntest/deep/leaf  Flat: #nntest-flat

   > [!note] Callout
   > Tag in a callout: #nntest/callout
   ```

3. Let Sync finish on the iPhone and iPad. Check under **Settings → Community plugins** that **NN Tag Click** is listed and enabled. If not, check the two Sync toggles in the README.

Before each step, **hide NN** and collapse `nntest` in NN's tag tree:
- **Mac:** collapse the left sidebar.
- **iPhone:** close the left drawer.
- **iPad:** collapse the sidebar, or close the drawer if it isn't pinned.

Expected result for every "✅ NN" step: NN appears, `nntest` and its sub-tag are expanded, and the tag is highlighted. Core Search does **not** open.

## macOS

| # | Do | Expect |
| - | -- | ------ |
| M1 | Live Preview: click `deep/leaf` in `#nntest/deep/leaf` | ✅ NN, `nntest/deep/leaf` selected |
| M2 | Live Preview: click just the `#` of `#nntest-flat` | ✅ NN, `nntest-flat` selected |
| M3 | Click the `nntest/props` pill in Properties | ✅ NN, `nntest/props` selected |
| M4 | Click the pill's **×** (then undo with Cmd-Z) | Tag is removed; NN doesn't react |
| M5 | Switch to Reading view (Cmd-E), click `#nntest/deep/leaf` | ✅ NN |
| M6 | Reading view: click `#nntest/callout` inside the callout | ✅ NN |
| M7 | Cmd-click any tag | Core Search opens with `tag:#…`, as before |
| M8 | Live Preview: Shift-click a tag | Text selection extends; neither NN nor Search |
| M9 | Switch to Source mode, click a tag | Cursor moves into the tag; nothing else happens |
| M10 | In the left sidebar, put the Files (or Search) tab in front of NN, then click a tag | ✅ NN tab comes to the front |
| M11 | Hover a link to this note to get a page preview; click a tag in the popover | ✅ NN |
| M12 | Open the note in a pop-out window (right-click tab → *Move to new window*), click a tag | ✅ NN in the main window |
| M13 | Put the cursor inside `#nntest-flat`, run *Reveal tag at cursor in Notebook Navigator* from the command palette | ✅ NN |
| M14 | In NN settings, hide tag `nntest-flat`, then click it | Core Search opens (default fallback). Un-hide afterwards. |
| M15 | Disable Notebook Navigator, click a tag, re-enable | Core Search opens; no error notice |

## iPhone

| # | Do | Expect |
| - | -- | ------ |
| P1 | Live Preview: tap `#nntest/deep/leaf` | ✅ NN drawer slides in, tag tree visible (not the file list), tag selected. **The keyboard is not up.** |
| P2 | Tap `#nntest-flat` | ✅ NN |
| P3 | Tap the `nntest/props` pill | ✅ NN |
| P4 | Reading view: tap `#nntest/callout` | ✅ NN |
| P5 | Source mode: tap a tag | Cursor goes there, keyboard appears; NN doesn't open |
| P6 | Long-press a tag in Live Preview | Normal text selection / context menu; NN doesn't open |
| P7 | Add *Reveal tag at cursor…* to the mobile toolbar, put the cursor in a tag, tap it | ✅ NN |
| P8 | Force-quit Obsidian, reopen, and **immediately** tap a tag | ✅ NN, possibly after a short delay while NN indexes. No error. |

## iPad

Repeat P1–P4 and P8 in both orientations. Also do:

| # | Do | Expect |
| - | -- | ------ |
| T1 | With the sidebar pinned open, tap a tag | ✅ NN tag selected, sidebar stays open |
| T2 | With an external keyboard: Cmd-tap a tag | Core Search opens |

## If something fails

Note the step, the device and the Obsidian/NN versions (**Settings → About**, **Settings → Community plugins**). On the Mac, open the developer console (Cmd-Opt-I) and look for messages starting with `[nn-tag-click]`.

If a tap on iOS opens core Search instead of NN, Obsidian has changed its DOM or how it handles tag taps on mobile. Inspect the tag element with Safari's Web Inspector (Develop menu → your device → Obsidian) and compare it with the selectors in `src/tags.ts`.

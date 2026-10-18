/**
 * DOM snippets shaped like Obsidian's real markup (checked against Obsidian 1.x;
 * the e2e suite verifies the same selectors in the running app).
 */

export const ALL_ON = { rendered: true, livePreview: true, properties: true };

export function mount(html: string): HTMLElement {
    document.body.innerHTML = html;
    return document.body;
}

export const readingView = `
<div class="workspace-leaf-content" data-type="markdown" data-mode="preview">
  <div class="markdown-reading-view"><div class="markdown-preview-view">
    <p>Some text <a href="#project/alpha" class="tag" target="_blank" rel="noopener nofollow">#project/alpha</a> more</p>
  </div></div>
</div>`;

export const livePreview = `
<div class="workspace-leaf-content" data-type="markdown" data-mode="source">
  <div class="markdown-source-view cm-s-obsidian mod-cm6 is-live-preview">
    <div class="cm-editor"><div class="cm-scroller"><div class="cm-content" contenteditable="true">
      <div class="cm-line">See <span class="cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-meta cm-tag-projectalpha" id="begin">#</span><span class="cm-hashtag cm-meta cm-hashtag-end cm-tag-projectalpha" id="end">project/alpha</span> and <span class="cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-meta" id="b2">#</span><span class="cm-hashtag cm-meta cm-hashtag-end" id="e2">other</span><span id="plain">plain</span></div>
    </div></div></div>
  </div>
</div>`;

export const sourceMode = livePreview.replace(' is-live-preview', '');

export const propertiesPanel = `
<div class="metadata-container">
  <div class="metadata-property" data-property-key="tags" data-property-type="multitext">
    <div class="metadata-property-value">
      <div class="multi-select-container">
        <div class="multi-select-pill" tabindex="0" id="pill">
          <div class="multi-select-pill-content"><span id="pill-text">project/alpha</span></div>
          <div class="multi-select-pill-remove-button" id="pill-remove"><svg></svg></div>
        </div>
      </div>
    </div>
  </div>
  <div class="metadata-property" data-property-key="aliases">
    <div class="multi-select-pill"><div class="multi-select-pill-content"><span id="alias">Alpha</span></div></div>
  </div>
</div>`;

export const insideNavigator = `
<div class="workspace-leaf-content" data-type="notebook-navigator">
  <a class="tag" href="#nn" id="nn-tag">#nn</a>
</div>`;

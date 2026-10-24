import { json } from "@codemirror/lang-json";
import {
  foldGutter,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  closeSearchPanel,
  openSearchPanel,
  search,
  searchKeymap,
  searchPanelOpen,
} from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { mdiCheck, mdiContentCopy, mdiMagnify } from "@mdi/js";
import type { ModulesData } from "@timmo001/effect-system-bridge";
import { html, LitElement, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import { icon } from "./shared-styles";

/** CodeMirror's theme, from the design tokens so it follows every theme. */
const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--sb-color-text)",
    backgroundColor: "var(--sb-color-sunken)",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--sb-font-code)",
    fontSize: "var(--sb-font-size-s)",
    lineHeight: "1.55",
  },
  ".cm-content": {
    padding: "var(--sb-space-3) 0",
    caretColor: "var(--sb-color-accent)",
  },
  ".cm-gutters": {
    color: "var(--sb-color-muted)",
    backgroundColor: "var(--sb-color-sunken)",
    border: "none",
    borderRight: "1px solid var(--sb-color-border)",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-foldPlaceholder": {
    color: "var(--sb-color-accent)",
    backgroundColor: "var(--sb-color-accent-soft)",
    border: "none",
    padding: "0 var(--sb-space-1-5)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--sb-color-accent-soft) !important",
  },
  ".cm-searchMatch": {
    backgroundColor:
      "color-mix(in oklab, var(--sb-color-warning) 30%, transparent)",
    borderRadius: "var(--sb-radius-s)",
  },
  ".cm-searchMatch-selected": {
    backgroundColor:
      "color-mix(in oklab, var(--sb-color-accent) 45%, transparent)",
  },
  ".cm-panels": {
    color: "var(--sb-color-text)",
    backgroundColor: "var(--sb-color-raised)",
  },
  ".cm-panels-top": { borderBottom: "1px solid var(--sb-color-border)" },
  ".cm-panel.cm-search": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "var(--sb-space-2)",
    padding:
      "var(--sb-space-2) var(--sb-space-10) var(--sb-space-2) var(--sb-space-3)",
    fontFamily: "var(--sb-font-body)",
    fontSize: "var(--sb-font-size-xs)",
  },
  ".cm-search br": { display: "none" },
  ".cm-panel.cm-search label": {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--sb-space-1)",
  },
  ".cm-textfield, .cm-button": {
    height: "1.875rem",
    margin: "0",
    padding: "0 var(--sb-space-2)",
    font: "inherit",
    color: "var(--sb-color-text)",
    backgroundColor: "var(--sb-color-sunken)",
    backgroundImage: "none",
    border: "1px solid var(--sb-color-border)",
    borderRadius: "var(--sb-radius-m)",
  },
  ".cm-textfield:focus": {
    outline: "none",
    borderColor: "var(--sb-color-accent)",
  },
  ".cm-button": { cursor: "pointer" },
  ".cm-button:hover": { borderColor: "var(--sb-color-accent)" },
  ".cm-panel.cm-search [name=close]": {
    top: "50%",
    right: "var(--sb-space-3)",
    transform: "translateY(-50%)",
    fontSize: "var(--sb-font-size-l)",
    color: "var(--sb-color-muted)",
    cursor: "pointer",
  },
});

const highlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.propertyName, color: "var(--sb-color-chart-1)" },
    { tag: tags.string, color: "var(--sb-color-chart-3)" },
    { tag: tags.number, color: "var(--sb-color-chart-2)" },
    { tag: tags.bool, color: "var(--sb-color-chart-4)" },
    { tag: tags.null, color: "var(--sb-color-muted)" },
    { tag: tags.punctuation, color: "var(--sb-color-muted)" },
    { tag: tags.separator, color: "var(--sb-color-muted)" },
  ]),
);

/** The search panel's words, in sentence case like the rest of the client. */
const searchPhrases = EditorState.phrases.of({
  Find: "Search",
  next: "Next",
  previous: "Previous",
  all: "All",
  "match case": "Match case",
  regexp: "Regex",
  "by word": "Whole word",
  close: "Close",
});

/** Any module's data, as the connector decoded it. */
export type JsonData = ModulesData[keyof ModulesData] | null;

const format = (data: JsonData): string => {
  if (data === undefined) return "null";

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return "Unable to format data";
  }
};

/**
 * Data as read-only, foldable JSON, with a button to copy it.
 *
 * Styles live in the template, because CodeMirror replaces the shadow root's
 * adopted style sheets with its own.
 */
@customElement("sb-json-view")
export class SbJsonView extends LitElement {
  @property({ attribute: false }) data: JsonData = null;

  /** What the data is, for screen readers. */
  @property() label = "JSON data";

  @state() private copied = false;

  @query(".editor") private container?: HTMLElement;

  #view: EditorView | undefined;

  #copiedTimer: ReturnType<typeof setTimeout> | undefined;

  // Fills the window below where the view starts, which moves as the page
  // header wraps or the window resizes
  readonly #resize = new ResizeObserver(() => {
    this.#measure();
  });

  #measure() {
    const top = this.getBoundingClientRect().top + window.scrollY;
    this.style.setProperty("--sb-json-top", `${top}px`);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#resize.observe(document.documentElement);
    window.addEventListener("keydown", this.#findShortcut, true);
  }

  protected override firstUpdated(): void {
    this.#measure();

    if (!this.container) return;

    this.#view = new EditorView({
      state: EditorState.create({
        doc: format(this.data),
        extensions: [
          json(),
          // Read-only but focusable, so the keyboard can select and search
          EditorState.readOnly.of(true),
          lineNumbers(),
          foldGutter(),
          search({
            top: true,
            scrollToMatch: (range) =>
              EditorView.scrollIntoView(range, { y: "center" }),
          }),
          // Keeps the buttons clear of the search panel above the data
          EditorView.updateListener.of((update) => {
            update.view.requestMeasure({
              read: (view) => {
                const panels = view.dom.querySelector(".cm-panels-top");

                return panels instanceof HTMLElement ? panels.offsetHeight : 0;
              },
              write: (height) => {
                this.style.setProperty("--sb-json-panel", `${height}px`);
              },
            });
          }),
          keymap.of(searchKeymap),
          searchPhrases,
          editorTheme,
          highlightStyle,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": this.label }),
        ],
      }),
      parent: this.container,
      root: this.renderRoot instanceof ShadowRoot ? this.renderRoot : document,
    });
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("data") || this.#view === undefined) return;

    const next = format(this.data);
    const current = this.#view.state.doc.toString();

    if (next !== current) {
      // Keep the scroll position and folds while live data changes
      this.#view.dispatch({
        changes: { from: 0, to: current.length, insert: next },
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#resize.disconnect();
    window.removeEventListener("keydown", this.#findShortcut, true);
    clearTimeout(this.#copiedTimer);
    this.#view?.destroy();
    this.#view = undefined;
  }

  // While the view is shown, Ctrl+F anywhere searches the data rather than
  // the page
  #findShortcut = (event: KeyboardEvent) => {
    const find =
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === "f";

    if (!find || this.#view === undefined) return;

    event.preventDefault();
    event.stopPropagation();
    openSearchPanel(this.#view);
  };

  #toggleSearch = () => {
    if (this.#view === undefined) return;

    if (searchPanelOpen(this.#view.state)) closeSearchPanel(this.#view);
    else openSearchPanel(this.#view);
  };

  #copy = async () => {
    try {
      await navigator.clipboard.writeText(format(this.data));
      this.copied = true;
      clearTimeout(this.#copiedTimer);
      this.#copiedTimer = setTimeout(() => {
        this.copied = false;
      }, 2000);
    } catch (error) {
      console.error("Couldn't copy the data", error);
    }
  };

  override render() {
    return html`
      <style>
        :host {
          position: relative;
          display: block;
          height: var(
            --sb-json-height,
            max(
              20rem,
              calc(100dvh - var(--sb-json-top, 0px) - var(--sb-space-12))
            )
          );
          overflow: hidden;
          border: 1px solid var(--sb-color-border);
          border-radius: var(--sb-radius-l);
        }

        .editor {
          position: absolute;
          inset: 0;
        }

        .tools {
          position: absolute;
          top: calc(var(--sb-json-panel, 0px) + var(--sb-space-2));
          right: var(--sb-space-3);
          z-index: 1;
          display: flex;
          gap: var(--sb-space-2);
        }

        button {
          display: inline-flex;
          align-items: center;
          gap: var(--sb-space-1-5);
          height: 1.875rem;
          padding: 0 var(--sb-space-3);
          font: inherit;
          font-family: var(--sb-font-body);
          font-size: var(--sb-font-size-xs);
          color: var(--sb-color-text);
          cursor: pointer;
          background: var(--sb-color-raised);
          border: 1px solid var(--sb-color-border);
          border-radius: var(--sb-radius-m);
        }

        button:hover {
          border-color: var(--sb-color-accent);
        }

        .icon {
          width: 1rem;
          height: 1rem;
          fill: currentColor;
        }
      </style>
      <div class="editor"></div>
      <div class="tools">
        <button
          type="button"
          title="Search (Ctrl+F)"
          @click=${this.#toggleSearch}
        >
          ${icon(mdiMagnify)} Search
        </button>
        <button type="button" @click=${this.#copy}>
          ${icon(this.copied ? mdiCheck : mdiContentCopy)}
          ${this.copied ? "Copied" : "Copy"}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-json-view": SbJsonView;
  }
}

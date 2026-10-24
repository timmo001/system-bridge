import { json } from "@codemirror/lang-json";
import {
  foldGutter,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { mdiCheck, mdiContentCopy } from "@mdi/js";
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

  protected override firstUpdated(): void {
    if (!this.container) return;

    this.#view = new EditorView({
      state: EditorState.create({
        doc: format(this.data),
        extensions: [
          json(),
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          lineNumbers(),
          foldGutter(),
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
    clearTimeout(this.#copiedTimer);
    this.#view?.destroy();
    this.#view = undefined;
  }

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
          height: var(--sb-json-height, 36rem);
          overflow: hidden;
          border: 1px solid var(--sb-color-border);
          border-radius: var(--sb-radius-l);
        }

        .editor {
          position: absolute;
          inset: 0;
        }

        button {
          position: absolute;
          top: var(--sb-space-2);
          right: var(--sb-space-3);
          z-index: 1;
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
      <button type="button" @click=${this.#copy}>
        ${icon(this.copied ? mdiCheck : mdiContentCopy)}
        ${this.copied ? "Copied" : "Copy"}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-json-view": SbJsonView;
  }
}

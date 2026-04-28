import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import {
  foldGutter,
  syntaxHighlighting,
  HighlightStyle,
} from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { tags } from "@lezer/highlight";

// -- Theme (Catppuccin Mocha-inspired, matching existing code-block colors) --

const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "oklch(0.21 0.02 256.848)",
      color: "oklch(0.97 0.01 89.937)",
      height: "100%",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    ".cm-content": {
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: "0.875rem",
      lineHeight: "1.5",
      caretColor: "oklch(0.87 0.06 89.937)",
      padding: "0.5rem 0",
    },
    ".cm-gutters": {
      backgroundColor: "oklch(0.19 0.02 256.848)",
      color: "oklch(0.55 0.02 256.848)",
      border: "none",
      borderRight: "1px solid oklch(0.30 0.02 256.848)",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "oklch(0.30 0.02 256.848)",
      color: "oklch(0.65 0.17 189.346)",
      border: "none",
      padding: "0 0.5rem",
    },
  },
  { dark: true },
);

const highlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.propertyName, color: "oklch(0.64 0.17 189.346)" }, // keys — sapphire
    { tag: tags.string, color: "oklch(0.73 0.13 142.12)" }, // strings — green
    { tag: tags.number, color: "oklch(0.71 0.18 49.799)" }, // numbers — peach
    { tag: tags.bool, color: "oklch(0.69 0.15 276.07)" }, // booleans — mauve
    { tag: tags.null, color: "oklch(0.77 0.02 256.848)" }, // null — subtext1
    { tag: tags.punctuation, color: "oklch(0.77 0.02 256.848)" }, // braces/brackets
    { tag: tags.separator, color: "oklch(0.65 0.02 256.848)" }, // commas/colons
  ]),
);

@customElement("ui-code-block")
class CodeBlock extends LitElement {
  // Styles are inline in render() because CodeMirror's style-mod replaces
  // adoptedStyleSheets on the shadow root, wiping out LitElement's static styles.

  @property({ type: Object }) data: unknown = null;
  @property() language = "json";

  private _editorView: EditorView | null = null;

  protected createRenderRoot() {
    return this.shadowRoot || this.attachShadow({ mode: "open" });
  }

  render() {
    return html`
      <style>
        :host {
          position: relative !important;
          display: block !important;
          min-height: 0 !important;
          border-radius: 0.5rem;
          overflow: hidden !important;
        }
        .editor-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
      </style>
      <div class="editor-container" id="editor"></div>
    `;
  }

  protected firstUpdated(): void {
    this._createEditor();
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("data") && this._editorView) {
      const newDoc = this._formatData();
      const currentDoc = this._editorView.state.doc.toString();
      if (newDoc !== currentDoc) {
        this._editorView.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: newDoc },
        });
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._editorView) {
      this._editorView.destroy();
      this._editorView = null;
    }
  }

  private _createEditor(): void {
    const container = this.renderRoot.querySelector("#editor");
    if (!container) return;

    const extensions = [
      json(),
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
      lineNumbers(),
      foldGutter(),
      editorTheme,
      highlightStyle,
      EditorView.lineWrapping,
    ];

    this._editorView = new EditorView({
      state: EditorState.create({
        doc: this._formatData(),
        extensions,
      }),
      parent: container,
    });
  }

  private _formatData(): string {
    if (this.data === null || this.data === undefined) {
      return "null";
    }
    try {
      return JSON.stringify(this.data, null, 2);
    } catch {
      return String(this.data);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-code-block": CodeBlock;
  }
}

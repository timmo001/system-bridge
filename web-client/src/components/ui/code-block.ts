import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

@customElement("ui-code-block")
export class CodeBlock extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    pre {
      margin: 0;
      padding: 1rem;
      overflow-x: auto;
      border-radius: 0.5rem;
      background-color: oklch(0.21 0.02 256.848);
      color: oklch(0.97 0.01 89.937);
    }

    code {
      font-family: "Courier New", Courier, monospace;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    /* JSON syntax highlighting */
    .json-key {
      color: oklch(0.64 0.17 189.346); /* sapphire */
    }

    .json-string {
      color: oklch(0.73 0.13 142.12); /* green */
    }

    .json-number {
      color: oklch(0.71 0.18 49.799); /* peach */
    }

    .json-boolean {
      color: oklch(0.69 0.15 276.07); /* mauve */
    }

    .json-null {
      color: oklch(0.77 0.02 256.848); /* subtext1 */
    }
  `;

  @property({ type: Object }) data: any = null;
  @property() language = "json";

  protected createRenderRoot() {
    return this.shadowRoot || this.attachShadow({ mode: "open" });
  }

  render() {
    const formattedCode = this.formatJSON(this.data);

    return html` <pre><code>${unsafeHTML(formattedCode)}</code></pre> `;
  }

  private formatJSON(data: any): string {
    if (data === null || data === undefined) {
      return '<span class="json-null">null</span>';
    }

    const json = JSON.stringify(data, null, 2);
    return this.highlightJSON(json);
  }

  private highlightJSON(json: string): string {
    return json
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: null/g, ': <span class="json-null">null</span>');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-code-block": CodeBlock;
  }
}

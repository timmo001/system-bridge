import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ConnectionSettings } from "./sb-connection-mixin";

/**
 * Connection form component for System Bridge settings.
 * 
 * - Provides a form UI for configuring host, port, SSL, and API key
 * - Emits events when settings change or form is submitted
 * - Validates input and shows error states
 */
@customElement("sb-connection-form")
export class SBConnectionForm extends LitElement {
  /** Current connection settings */
  @property({ type: Object }) settings: ConnectionSettings = {
    host: "localhost",
    port: 9170,
    ssl: false,
    apiKey: ""
  };

  /** Whether the form is in a valid state */
  @property({ type: Boolean }) isValid = false;

  /** Whether to show validation errors */
  @property({ type: Boolean }) showErrors = false;

  static styles = css`
    :host {
      display: block;
      max-width: 400px;
      margin: 0 auto;
      padding: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #374151;
    }

    input[type="text"],
    input[type="number"],
    input[type="password"] {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      transition: border-color 0.15s ease-in-out;
    }

    input[type="text"]:focus,
    input[type="number"]:focus,
    input[type="password"]:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    input[type="checkbox"] {
      margin-right: 0.5rem;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
    }

    .error {
      color: #dc2626;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .button-group {
      display: flex;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }

    button {
      flex: 1;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease-in-out;
    }

    button[type="submit"] {
      background-color: #3b82f6;
      color: white;
    }

    button[type="submit"]:hover:not(:disabled) {
      background-color: #2563eb;
    }

    button[type="submit"]:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }

    button[type="button"] {
      background-color: #f3f4f6;
      color: #374151;
    }

    button[type="button"]:hover {
      background-color: #e5e7eb;
    }

    .status {
      margin-top: 1rem;
      padding: 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .status.valid {
      background-color: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .status.invalid {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.validateForm();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has("settings")) {
      this.validateForm();
    }
  }

  /**
   * Validate the current form state.
   */
  private validateForm() {
    this.isValid = !!(
      this.settings.host &&
      this.settings.port > 0 &&
      this.settings.port <= 65535 &&
      this.settings.apiKey
    );
  }

  /**
   * Handle input changes and emit update events.
   */
  private handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    
    let newValue: string | number | boolean = value;
    
    if (type === "number") {
      newValue = parseInt(value, 10) || 0;
    } else if (type === "checkbox") {
      newValue = checked;
    }

    const updatedSettings = { ...this.settings, [name]: newValue };
    
    this.dispatchEvent(new CustomEvent("settings-change", {
      detail: { settings: updatedSettings },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle form submission.
   */
  private handleSubmit(event: Event) {
    event.preventDefault();
    
    if (this.isValid) {
      this.dispatchEvent(new CustomEvent("settings-submit", {
        detail: { settings: this.settings },
        bubbles: true,
        composed: true
      }));
    } else {
      this.showErrors = true;
    }
  }

  /**
   * Handle reset button click.
   */
  private handleReset() {
    this.dispatchEvent(new CustomEvent("settings-reset", {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <form @submit="${this.handleSubmit}">
        <div class="form-group">
          <label for="host">Host</label>
          <input
            type="text"
            id="host"
            name="host"
            .value="${this.settings.host}"
            @input="${this.handleInput}"
            placeholder="localhost"
            required
          />
          ${this.showErrors && !this.settings.host ? html`<div class="error">Host is required</div>` : ""}
        </div>

        <div class="form-group">
          <label for="port">Port</label>
          <input
            type="number"
            id="port"
            name="port"
            .value="${this.settings.port}"
            @input="${this.handleInput}"
            min="1"
            max="65535"
            required
          />
          ${this.showErrors && (this.settings.port <= 0 || this.settings.port > 65535) ? 
            html`<div class="error">Port must be between 1 and 65535</div>` : ""}
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input
              type="checkbox"
              id="ssl"
              name="ssl"
              .checked="${this.settings.ssl}"
              @change="${this.handleInput}"
            />
            <label for="ssl">Use SSL/TLS</label>
          </div>
        </div>

        <div class="form-group">
          <label for="apiKey">API Key</label>
          <input
            type="password"
            id="apiKey"
            name="apiKey"
            .value="${this.settings.apiKey}"
            @input="${this.handleInput}"
            placeholder="Enter authentication API key"
            required
          />
          ${this.showErrors && !this.settings.apiKey ? html`<div class="error">API Key is required</div>` : ""}
        </div>

        <div class="button-group">
          <button type="submit" ?disabled="${!this.isValid}">
            Connect
          </button>
          <button type="button" @click="${this.handleReset}">
            Reset
          </button>
        </div>

        <div class="status ${this.isValid ? "valid" : "invalid"}">
          ${this.isValid ? 
            html`✓ Ready to connect to ${this.settings.ssl ? "WSS" : "WS"}://${this.settings.host}:${this.settings.port}` :
            html`✗ Please fill in all required fields`
          }
        </div>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-connection-form": SBConnectionForm;
  }
}

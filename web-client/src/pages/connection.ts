import { html, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import {
  actionResult,
  connectionSettings,
  registry,
  testConnection,
} from "~/lib/atoms";
import { PageElement } from "~/mixins/page-element";

import "../components/ui/button";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";
import "../components/ui/switch";

interface ConnectionForm {
  host: string;
  port: number;
  ssl: boolean;
  token: string;
}

function validate(
  form: ConnectionForm,
): Partial<Record<keyof ConnectionForm, string>> {
  return {
    ...(!form.host.trim() && { host: "Host is required" }),
    ...(!(form.port >= 1) && { port: "Port must be at least 1" }),
    ...(!form.token && { token: "Token is required" }),
  };
}

@customElement("page-connection")
class PageConnection extends PageElement {
  title = "Connection Settings";
  description = "Configure your connection to System Bridge";

  readonly #test = new AtomController(this, () => testConnection);

  @state()
  private formData: ConnectionForm = {
    host: "0.0.0.0",
    port: 9170,
    ssl: false,
    token: "",
  };

  @state()
  private errors: Partial<Record<keyof ConnectionForm, string>> = {};

  private get isSubmitting(): boolean {
    return this.#test.value.waiting;
  }

  connectedCallback() {
    super.connectedCallback();

    const connection = registry.get(connectionSettings);

    this.formData = {
      host: connection.host,
      port: connection.port,
      ssl: connection.ssl,
      token: connection.token ?? "",
    };
  }

  private handleHostInput = (e: Event & { target: HTMLInputElement }): void => {
    this.formData = { ...this.formData, host: e.target.value };
  };

  private handlePortInput = (e: Event & { target: HTMLInputElement }): void => {
    this.formData = { ...this.formData, port: parseInt(e.target.value, 10) };
  };

  private handleSslChange = (e: CustomEvent<{ checked: boolean }>): void => {
    this.formData = { ...this.formData, ssl: e.detail.checked };
  };

  private handleTokenInput = (
    e: Event & { target: HTMLInputElement },
  ): void => {
    this.formData = { ...this.formData, token: e.target.value };
  };

  private handleCancel = (): void => {
    this.navigate("/");
  };

  private validateForm(): boolean {
    this.errors = validate(this.formData);

    return Object.keys(this.errors).length === 0;
  }

  private handleSubmit = (e: Event): void => {
    e.preventDefault();

    if (!this.validateForm()) return;

    const { host, port, ssl, token } = this.formData;

    registry.set(testConnection, {
      settings: { host, port, ssl, token },
      token,
    });
  };

  private renderFieldError(field: keyof ConnectionForm): TemplateResult {
    const error = this.errors[field];

    if (!error) return html``;

    return html`<p class="text-sm text-destructive">${error}</p>`;
  }

  render() {
    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-2xl mx-auto space-y-6">
          ${this.renderPageHeader({ showConnectionIndicator: false })}
          ${this.renderPageResult(
            actionResult(this.#test.value, "Connected to System Bridge"),
          )}

          <form @submit=${this.handleSubmit} class="space-y-6">
            <div class="space-y-2">
              <ui-label>Host</ui-label>
              <ui-input
                type="text"
                name="host"
                .value=${this.formData.host}
                placeholder="0.0.0.0"
                ?disabled=${this.isSubmitting}
                @input=${this.handleHostInput}
              ></ui-input>
              ${this.renderFieldError("host")}
              <p class="text-sm text-muted-foreground">
                The hostname or IP address of the System Bridge server
              </p>
            </div>

            <div class="space-y-2">
              <ui-label>Port</ui-label>
              <ui-input
                type="number"
                name="port"
                .value=${String(this.formData.port)}
                placeholder="9170"
                ?disabled=${this.isSubmitting}
                @input=${this.handlePortInput}
              ></ui-input>
              ${this.renderFieldError("port")}
              <p class="text-sm text-muted-foreground">
                The port number of the System Bridge server (default: 9170)
              </p>
            </div>

            <div class="flex items-center justify-between space-y-2">
              <div class="space-y-0.5">
                <ui-label>Use SSL</ui-label>
                <p class="text-sm text-muted-foreground">
                  Enable if your server uses HTTPS
                </p>
              </div>
              <ui-switch
                .checked=${this.formData.ssl}
                ?disabled=${this.isSubmitting}
                @switch-change=${this.handleSslChange}
              ></ui-switch>
            </div>

            <div class="space-y-2">
              <ui-label>API Token</ui-label>
              <ui-input
                type="password"
                name="token"
                .value=${this.formData.token}
                placeholder="Your API token"
                ?disabled=${this.isSubmitting}
                @input=${this.handleTokenInput}
              ></ui-input>
              ${this.renderFieldError("token")}
              <p class="text-sm text-muted-foreground">
                Your System Bridge API token for authentication
              </p>
            </div>

            <div class="flex gap-4">
              <ui-button
                type="submit"
                variant="default"
                ?disabled=${this.isSubmitting}
              >
                ${
                  this.isSubmitting
                    ? "Testing Connection..."
                    : "Test Connection"
                }
              </ui-button>
              <ui-button
                type="button"
                variant="outline"
                ?disabled=${this.isSubmitting}
                @click=${this.handleCancel}
              >
                Cancel
              </ui-button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-connection": PageConnection;
  }
}

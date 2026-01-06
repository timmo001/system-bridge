import { consume, provide } from "@lit/context";
import { Either, Schema } from "effect";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
  saveConnectionSettings,
} from "~/contexts/connection";
import { CONNECTION_TIMEOUT } from "~/contexts/websocket";
import { PageElement } from "~/mixins";

import "../components/ui/button";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";
import "../components/ui/switch";

const ConnectionSchema = Schema.Struct({
  host: Schema.String.pipe(Schema.nonEmptyString()),
  port: Schema.NumberFromString.pipe(Schema.greaterThan(0)),
  ssl: Schema.Boolean,
  token: Schema.String.pipe(Schema.nonEmptyString()),
});

type ConnectionForm = typeof ConnectionSchema.Type;

@customElement("page-connection")
export class PageConnection extends PageElement {
  title = "Connection Settings";
  description = "Configure your connection to System Bridge";

  @consume({ context: connectionContext, subscribe: true })
  @state()
  connection?: ConnectionSettings;

  @state()
  private formData: ConnectionForm = {
    host: "0.0.0.0",
    port: 9170,
    ssl: false,
    token: "",
  };

  @state()
  private errors: Partial<Record<keyof ConnectionForm, string>> = {};

  @state()
  private isSubmitting = false;

  @provide({ context: connectionContext })
  get updatedConnection(): ConnectionSettings {
    return this.connection!;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.connection) {
      this.formData = {
        host: this.connection.host,
        port: this.connection.port,
        ssl: this.connection.ssl,
        token: this.connection.token || "",
      };
    }
  }

  private handleHostInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    this.formData = { ...this.formData, host: input.value };
  };

  private handlePortInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    this.formData = { ...this.formData, port: parseInt(input.value, 10) };
  };

  private handleSslChange = (e: CustomEvent<{ checked: boolean }>): void => {
    this.formData = { ...this.formData, ssl: e.detail.checked };
  };

  private handleTokenInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    this.formData = { ...this.formData, token: input.value };
  };

  private handleCancel = (): void => {
    this.navigate("/");
  };

  private validateForm(): boolean {
    const result = Schema.decodeUnknownEither(ConnectionSchema)(this.formData);
    if (Either.isLeft(result)) {
      this.errors = {};
      const issues = result.left.message.split("\n");
      // Simple error extraction - Effect Schema errors include field names
      if (this.formData.host === "") {
        this.errors.host = "Host is required";
      }
      if (!this.formData.port || this.formData.port < 1) {
        this.errors.port = "Port must be at least 1";
      }
      if (this.formData.token === "") {
        this.errors.token = "Token is required";
      }
      // Log full error for debugging
      console.debug("Validation errors:", issues);
      this.requestUpdate();
      return false;
    }
    this.errors = {};
    this.requestUpdate();
    return true;
  }

  private handleSubmit = (e: Event): void => {
    e.preventDefault();
    if (!this.validateForm()) return;

    this.isSubmitting = true;
    this.requestUpdate();

    const ws = new WebSocket(
      `${this.formData.ssl ? "wss" : "ws"}://${this.formData.host}:${this.formData.port}/api/websocket`,
    );

    const timeout = setTimeout(() => {
      ws.close();
      this.isSubmitting = false;
      this.requestUpdate();
    }, CONNECTION_TIMEOUT);

    ws.onopen = () => {
      clearTimeout(timeout);

      ws.send(
        JSON.stringify({
          id: "test-connection",
          event: "GET_SETTINGS",
          token: this.formData.token,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as {
          type?: string;
          subtype?: string;
          id?: string;
        };

        if (message.type === "ERROR" && message.subtype === "BAD_TOKEN") {
          ws.close();
          this.isSubmitting = false;
          this.requestUpdate();
          return;
        }

        if (
          message.type === "SETTINGS_RESULT" ||
          message.id === "test-connection"
        ) {
          const newSettings: ConnectionSettings = {
            host: this.formData.host,
            port: this.formData.port,
            ssl: this.formData.ssl,
            token: this.formData.token,
          };

          saveConnectionSettings(newSettings);

          this.dispatchEvent(
            new CustomEvent("connection-updated", {
              detail: newSettings,
              bubbles: true,
              composed: true,
            }),
          );

          ws.close();
          this.isSubmitting = false;
          this.requestUpdate();

          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to parse connection test response:", error);

        this.isSubmitting = false;
        this.requestUpdate();
      }
    };

    // Connection close handler for test connection
    // No specific error handling needed - this is just a test to verify connectivity
    ws.onclose = () => {
      clearTimeout(timeout);
      this.isSubmitting = false;
      this.requestUpdate();
    };

    ws.onerror = () => {
      clearTimeout(timeout);

      this.isSubmitting = false;
      this.requestUpdate();
    };
  };

  render() {
    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-2xl mx-auto space-y-6">
          ${this.renderPageHeader({ showConnectionIndicator: false })}

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
              ${this.errors.host
                ? html`<p class="text-sm text-destructive">
                    ${this.errors.host}
                  </p>`
                : ""}
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
              ${this.errors.port
                ? html`<p class="text-sm text-destructive">
                    ${this.errors.port}
                  </p>`
                : ""}
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
              ${this.errors.token
                ? html`<p class="text-sm text-destructive">
                    ${this.errors.token}
                  </p>`
                : ""}
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
                ${this.isSubmitting
                  ? "Testing Connection..."
                  : "Test Connection"}
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

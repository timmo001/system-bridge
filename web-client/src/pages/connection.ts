import { consume, provide } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { z } from "zod";

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

const ConnectionSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1, "Port must be at least 1"),
  ssl: z.boolean(),
  token: z.string().min(1, "Token is required"),
});

type ConnectionForm = z.infer<typeof ConnectionSchema>;

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
    const result = ConnectionSchema.safeParse(this.formData);
    if (!result.success) {
      this.errors = {};
      result.error.issues.forEach((err) => {
        const pathKey = err.path[0];
        if (pathKey && typeof pathKey === "string") {
          this.errors[pathKey as keyof ConnectionForm] = err.message;
        }
      });
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

    ws.onclose = (event) => {
      clearTimeout(timeout);
      if (event.code === 1006) {
      } else if (event.code === 1002) {
      } else if (event.code === 1003) {
      } else if (event.code !== 1000 && event.code !== 1001) {
      }
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

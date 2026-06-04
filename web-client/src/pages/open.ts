import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import {
  connectionStatusContext,
  type ConnectionStatus,
} from "~/contexts/connection-status";
import {
  websocketActionsContext,
  type WebSocketActions,
} from "~/contexts/websocket-actions";
import { SendablePageElement } from "~/mixins/sendable-page";
import "../components/ui/button";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";

type OpenType = "url" | "path";

@customElement("page-open")
class PageOpen extends SendablePageElement {
  title = "Open";
  description =
    "Open URLs in browser or files/folders with system applications";

  @consume({ context: connectionStatusContext, subscribe: true })
  status?: ConnectionStatus;

  @consume({ context: websocketActionsContext, subscribe: true })
  actions?: WebSocketActions;

  @consume({ context: connectionContext, subscribe: true })
  connection?: ConnectionSettings;

  @state()
  private openType: OpenType = "url";

  @state()
  private urlValue = "";

  @state()
  private pathValue = "";

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      "open-success",
      this.handleOpenSuccess as EventListener,
    );
    window.addEventListener(
      "open-error",
      this.handleOpenError as EventListener,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupTimeout();
    window.removeEventListener(
      "open-success",
      this.handleOpenSuccess as EventListener,
    );
    window.removeEventListener(
      "open-error",
      this.handleOpenError as EventListener,
    );
  }

  private handleOpenSuccess = (
    event: CustomEvent<{ requestId: string }>,
  ): void => {
    if (this.pendingRequestId === event.detail.requestId) {
      const message =
        this.openType === "url"
          ? "URL opened in default browser"
          : "Path opened with default application";
      this.showResult(true, message);
      this.clearSendingState();
    }
  };

  private handleOpenError = (
    event: CustomEvent<{ requestId: string; message: string }>,
  ): void => {
    if (this.pendingRequestId === event.detail.requestId) {
      this.showResult(false, event.detail.message || "Failed to open");
      this.clearSendingState();
    }
  };

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private handleTypeChangeUrl = (): void => {
    this.openType = "url";
  };

  private handleTypeChangePath = (): void => {
    this.openType = "path";
  };

  private handleUrlInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.urlValue = input.value;
  };

  private handlePathInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.pathValue = input.value;
  };

  // fallow-ignore-next-line complexity
  private handleOpen = (): void => {
    const value =
      this.openType === "url" ? this.urlValue.trim() : this.pathValue.trim();
    if (!value || !this.connection?.token || !this.actions) {
      return;
    }

    const openData: Record<string, unknown> =
      this.openType === "url" ? { url: value } : { path: value };

    this.sendWithTimeout((requestId) => {
      this.actions!.sendRequest({
        id: requestId,
        event: "OPEN",
        data: openData,
        token: this.connection!.token!,
      });
    }, "Failed to send open request");
  };

  private clearForm = (): void => {
    this.urlValue = "";
    this.pathValue = "";
  };

  private get currentValue(): string {
    return this.openType === "url" ? this.urlValue : this.pathValue;
  }

  private renderOpenTypeSelector() {
    return html`
      <div>
        <ui-label>Type</ui-label>
        <div class="flex gap-2 mt-1">
          <ui-button
            variant=${this.openType === "url" ? "default" : "outline"}
            size="sm"
            @click=${this.handleTypeChangeUrl}
            ?disabled=${this.isSending}
          >
            <ui-icon name="Globe" class="mr-2"></ui-icon>
            URL
          </ui-button>
          <ui-button
            variant=${this.openType === "path" ? "default" : "outline"}
            size="sm"
            @click=${this.handleTypeChangePath}
            ?disabled=${this.isSending}
          >
            <ui-icon name="FolderOpen" class="mr-2"></ui-icon>
            Path
          </ui-button>
        </div>
      </div>
    `;
  }

  private renderValueInput() {
    if (this.openType === "url") {
      return html`
        <div>
          <ui-label>URL *</ui-label>
          <ui-input
            placeholder="https://example.com"
            .value=${this.urlValue}
            @input=${this.handleUrlInput}
            ?disabled=${this.isSending}
          ></ui-input>
          <p class="text-xs text-muted-foreground mt-1">
            The URL will be opened in the system's default browser
          </p>
        </div>
      `;
    }
    return html`
      <div>
        <ui-label>Path *</ui-label>
        <ui-input
          placeholder="/path/to/file/or/folder"
          .value=${this.pathValue}
          @input=${this.handlePathInput}
          ?disabled=${this.isSending}
        ></ui-input>
        <p class="text-xs text-muted-foreground mt-1">
          The file or folder will be opened with the system's default
          application
        </p>
      </div>
    `;
  }

  private renderOpenForm() {
    return html`
      <div class="space-y-6">
        <div class="rounded-lg border bg-card p-6 space-y-4">
          <h2 class="text-xl font-semibold">Open URL or Path</h2>
          <p class="text-sm text-muted-foreground">
            Open a URL in the default browser or a file/folder with the default
            system application.
          </p>

          <div class="space-y-3">
            ${this.renderOpenTypeSelector()} ${this.renderValueInput()}

            <div class="flex justify-end gap-2 pt-2">
              <ui-button
                variant="outline"
                @click=${this.clearForm}
                ?disabled=${this.isSending}
              >
                <ui-icon name="X" class="mr-2"></ui-icon>
                Clear
              </ui-button>
              <ui-button
                variant="default"
                @click=${this.handleOpen}
                ?disabled=${this.isSending || !this.currentValue.trim()}
              >
                ${this.isSending
                  ? html`<ui-icon
                      name="Loader2"
                      className="animate-spin mr-2"
                    ></ui-icon>`
                  : html`<ui-icon name="ExternalLink" class="mr-2"></ui-icon>`}
                Open
              </ui-button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const isConnected = this.status?.isConnected ?? false;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          ${this.renderPageHeader()} ${this.renderPageResult(this.lastResult)}
          ${this.renderWithConnection(
            isConnected,
            "Please connect to System Bridge to open URLs or paths.",
            this.handleNavigateToConnection,
            this.renderOpenForm(),
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "page-open": PageOpen;
  }
}

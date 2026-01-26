import { consume } from "@lit/context";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import {
  connectionContext,
  type ConnectionSettings,
} from "~/contexts/connection";
import { websocketContext, type WebSocketState } from "~/contexts/websocket";
import { generateUUID } from "~/lib/utils";
import { PageElement } from "~/mixins";
import "../components/ui/button";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";

type OpenType = "url" | "path";

@customElement("page-open")
export class PageOpen extends PageElement {
  title = "Open";
  description =
    "Open URLs in browser or files/folders with system applications";

  @consume({ context: websocketContext, subscribe: true })
  websocket?: WebSocketState;

  @consume({ context: connectionContext, subscribe: true })
  connection?: ConnectionSettings;

  @state()
  private openType: OpenType = "url";

  @state()
  private urlValue = "";

  @state()
  private pathValue = "";

  @state()
  private isSending = false;

  @state()
  private lastResult: { success: boolean; message: string } | null = null;

  @state()
  private pendingRequestId: string | null = null;

  private sendTimeout: number | null = null;

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
    if (this.sendTimeout !== null) {
      clearTimeout(this.sendTimeout);
      this.sendTimeout = null;
    }
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

  private handleOpen = (): void => {
    const value =
      this.openType === "url" ? this.urlValue.trim() : this.pathValue.trim();
    if (!value) {
      return;
    }

    if (!this.connection?.token || !this.websocket?.sendRequest) {
      return;
    }

    this.isSending = true;
    const requestId = generateUUID();
    this.pendingRequestId = requestId;

    const openData: Record<string, unknown> =
      this.openType === "url" ? { url: value } : { path: value };

    try {
      this.websocket.sendRequest({
        id: requestId,
        event: "OPEN",
        data: openData,
        token: this.connection.token,
      });

      // Timeout after 30 seconds
      this.sendTimeout = window.setTimeout(() => {
        if (this.isSending && this.pendingRequestId === requestId) {
          this.showResult(false, "Request timed out");
          this.clearSendingState();
        }
      }, 30000);
    } catch (error) {
      console.error("Failed to send open request:", error);
      this.showResult(false, "Failed to send request");
      this.clearSendingState();
    }
  };

  private showResult(success: boolean, message: string): void {
    this.lastResult = { success, message };
  }

  private clearSendingState(): void {
    this.isSending = false;
    this.pendingRequestId = null;
    if (this.sendTimeout !== null) {
      clearTimeout(this.sendTimeout);
      this.sendTimeout = null;
    }
  }

  private clearForm = (): void => {
    this.urlValue = "";
    this.pathValue = "";
  };

  private get currentValue(): string {
    return this.openType === "url" ? this.urlValue : this.pathValue;
  }

  render() {
    const isConnected = this.websocket?.isConnected ?? false;

    return html`
      <div class="min-h-screen bg-background text-foreground p-8">
        <div class="max-w-4xl mx-auto space-y-6">
          ${this.renderPageHeader()}
          ${this.lastResult
            ? html`
                <div
                  class="rounded-lg border p-4 flex items-start gap-3 ${this
                    .lastResult.success
                    ? "border-green-800 bg-green-950/30"
                    : "border-red-800 bg-red-950/30"}"
                >
                  <ui-icon
                    name=${this.lastResult.success
                      ? "CheckCircle2"
                      : "AlertCircle"}
                    class="${this.lastResult.success
                      ? "text-green-400"
                      : "text-red-400"}"
                  ></ui-icon>
                  <div class="flex-1">
                    <div
                      class="font-medium ${this.lastResult.success
                        ? "text-green-200"
                        : "text-red-200"}"
                    >
                      ${this.lastResult.success ? "Success" : "Error"}
                    </div>
                    <div
                      class="text-sm mt-1 ${this.lastResult.success
                        ? "text-green-300"
                        : "text-red-300"}"
                    >
                      ${this.lastResult.message}
                    </div>
                  </div>
                </div>
              `
            : ""}
          ${!isConnected
            ? html`
                <ui-connection-required
                  message="Please connect to System Bridge to open URLs or paths."
                  @configure-connection=${this.handleNavigateToConnection}
                ></ui-connection-required>
              `
            : html`
                <div class="space-y-6">
                  <div class="rounded-lg border bg-card p-6 space-y-4">
                    <h2 class="text-xl font-semibold">Open URL or Path</h2>
                    <p class="text-sm text-muted-foreground">
                      Open a URL in the default browser or a file/folder with
                      the default system application.
                    </p>

                    <div class="space-y-3">
                      <div>
                        <ui-label>Type</ui-label>
                        <div class="flex gap-2 mt-1">
                          <ui-button
                            variant=${this.openType === "url"
                              ? "default"
                              : "outline"}
                            size="sm"
                            @click=${this.handleTypeChangeUrl}
                            ?disabled=${this.isSending}
                          >
                            <ui-icon name="Globe" class="mr-2"></ui-icon>
                            URL
                          </ui-button>
                          <ui-button
                            variant=${this.openType === "path"
                              ? "default"
                              : "outline"}
                            size="sm"
                            @click=${this.handleTypeChangePath}
                            ?disabled=${this.isSending}
                          >
                            <ui-icon name="FolderOpen" class="mr-2"></ui-icon>
                            Path
                          </ui-button>
                        </div>
                      </div>

                      ${this.openType === "url"
                        ? html`
                            <div>
                              <ui-label>URL *</ui-label>
                              <ui-input
                                placeholder="https://example.com"
                                .value=${this.urlValue}
                                @input=${this.handleUrlInput}
                                ?disabled=${this.isSending}
                              ></ui-input>
                              <p class="text-xs text-muted-foreground mt-1">
                                The URL will be opened in the system's default
                                browser
                              </p>
                            </div>
                          `
                        : html`
                            <div>
                              <ui-label>Path *</ui-label>
                              <ui-input
                                placeholder="/path/to/file/or/folder"
                                .value=${this.pathValue}
                                @input=${this.handlePathInput}
                                ?disabled=${this.isSending}
                              ></ui-input>
                              <p class="text-xs text-muted-foreground mt-1">
                                The file or folder will be opened with the
                                system's default application
                              </p>
                            </div>
                          `}

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
                          ?disabled=${this.isSending ||
                          !this.currentValue.trim()}
                        >
                          ${this.isSending
                            ? html`<ui-icon
                                name="Loader2"
                                className="animate-spin mr-2"
                              ></ui-icon>`
                            : html`<ui-icon
                                name="ExternalLink"
                                class="mr-2"
                              ></ui-icon>`}
                          Open
                        </ui-button>
                      </div>
                    </div>
                  </div>
                </div>
              `}
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

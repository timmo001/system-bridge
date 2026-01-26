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

@customElement("page-notifications")
export class PageNotifications extends PageElement {
  title = "Notifications";
  description = "Send desktop notifications to this system";

  @consume({ context: websocketContext, subscribe: true })
  websocket?: WebSocketState;

  @consume({ context: connectionContext, subscribe: true })
  connection?: ConnectionSettings;

  @state()
  private notificationTitle = "";

  @state()
  private notificationMessage = "";

  @state()
  private notificationIcon = "";

  @state()
  private notificationActionUrl = "";

  @state()
  private notificationSound = "";

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
      "notification-sent",
      this.handleNotificationSent as EventListener,
    );
    window.addEventListener(
      "notification-error",
      this.handleNotificationError as EventListener,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.sendTimeout !== null) {
      clearTimeout(this.sendTimeout);
      this.sendTimeout = null;
    }
    window.removeEventListener(
      "notification-sent",
      this.handleNotificationSent as EventListener,
    );
    window.removeEventListener(
      "notification-error",
      this.handleNotificationError as EventListener,
    );
  }

  private handleNotificationSent = (
    event: CustomEvent<{ requestId: string }>,
  ): void => {
    if (this.pendingRequestId === event.detail.requestId) {
      this.showResult(true, "Notification sent successfully");
      this.clearSendingState();
    }
  };

  private handleNotificationError = (
    event: CustomEvent<{ requestId: string; message: string }>,
  ): void => {
    if (this.pendingRequestId === event.detail.requestId) {
      this.showResult(
        false,
        event.detail.message || "Failed to send notification",
      );
      this.clearSendingState();
    }
  };

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private handleTitleInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.notificationTitle = input.value;
  };

  private handleMessageInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.notificationMessage = input.value;
  };

  private handleIconInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.notificationIcon = input.value;
  };

  private handleActionUrlInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.notificationActionUrl = input.value;
  };

  private handleSoundInput = (e: InputEvent): void => {
    const input = e.target as HTMLInputElement;
    this.notificationSound = input.value;
  };

  private handleSendNotification = (): void => {
    if (!this.notificationTitle.trim() || !this.notificationMessage.trim()) {
      return;
    }

    if (!this.connection?.token || !this.websocket?.sendRequest) {
      return;
    }

    this.isSending = true;
    const requestId = generateUUID();
    this.pendingRequestId = requestId;

    const notificationData: Record<string, unknown> = {
      title: this.notificationTitle.trim(),
      message: this.notificationMessage.trim(),
    };

    if (this.notificationIcon.trim()) {
      notificationData.icon = this.notificationIcon.trim();
    }

    if (this.notificationActionUrl.trim()) {
      notificationData.actionUrl = this.notificationActionUrl.trim();
    }

    if (this.notificationSound.trim()) {
      notificationData.sound = this.notificationSound.trim();
    }

    try {
      this.websocket.sendRequest({
        id: requestId,
        event: "NOTIFICATION",
        data: notificationData,
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
      console.error("Failed to send notification:", error);
      this.showResult(false, "Failed to send notification");
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
    this.notificationTitle = "";
    this.notificationMessage = "";
    this.notificationIcon = "";
    this.notificationActionUrl = "";
    this.notificationSound = "";
  };

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
                  message="Please connect to System Bridge to send notifications."
                  @configure-connection=${this.handleNavigateToConnection}
                ></ui-connection-required>
              `
            : html`
                <div class="space-y-6">
                  <div class="rounded-lg border bg-card p-6 space-y-4">
                    <h2 class="text-xl font-semibold">Send Notification</h2>
                    <p class="text-sm text-muted-foreground">
                      Send a desktop notification to this system. The
                      notification will appear using the system's native
                      notification system.
                    </p>

                    <div class="space-y-3">
                      <div>
                        <ui-label>Title *</ui-label>
                        <ui-input
                          placeholder="Enter notification title"
                          .value=${this.notificationTitle}
                          @input=${this.handleTitleInput}
                          ?disabled=${this.isSending}
                        ></ui-input>
                      </div>
                      <div>
                        <ui-label>Message *</ui-label>
                        <ui-input
                          placeholder="Enter notification message"
                          .value=${this.notificationMessage}
                          @input=${this.handleMessageInput}
                          ?disabled=${this.isSending}
                        ></ui-input>
                      </div>
                      <div>
                        <ui-label>Icon Path (optional)</ui-label>
                        <ui-input
                          placeholder="/path/to/icon.png"
                          .value=${this.notificationIcon}
                          @input=${this.handleIconInput}
                          ?disabled=${this.isSending}
                        ></ui-input>
                      </div>
                      <div>
                        <ui-label>Action URL (optional)</ui-label>
                        <ui-input
                          placeholder="https://example.com"
                          .value=${this.notificationActionUrl}
                          @input=${this.handleActionUrlInput}
                          ?disabled=${this.isSending}
                        ></ui-input>
                        <p class="text-xs text-muted-foreground mt-1">
                          URL to open when the notification is clicked
                        </p>
                      </div>
                      <div>
                        <ui-label>Sound Path (optional)</ui-label>
                        <ui-input
                          placeholder="/path/to/sound.wav"
                          .value=${this.notificationSound}
                          @input=${this.handleSoundInput}
                          ?disabled=${this.isSending}
                        ></ui-input>
                      </div>
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
                          @click=${this.handleSendNotification}
                          ?disabled=${this.isSending ||
                          !this.notificationTitle.trim() ||
                          !this.notificationMessage.trim()}
                        >
                          ${this.isSending
                            ? html`<ui-icon
                                name="Loader2"
                                className="animate-spin mr-2"
                              ></ui-icon>`
                            : html`<ui-icon
                                name="Bell"
                                class="mr-2"
                              ></ui-icon>`}
                          Send Notification
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
    "page-notifications": PageNotifications;
  }
}

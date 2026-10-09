import type { Notification } from "@timmo001/effect-system-bridge";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";

import { AtomController } from "~/controllers/atom-controller";
import { actionResult, registry, sendNotification } from "~/lib/atoms";
import { PageElement } from "~/mixins/page-element";
import "../components/ui/button";
import "../components/ui/connection-required";
import "../components/ui/icon";
import "../components/ui/input";
import "../components/ui/label";

@customElement("page-notifications")
class PageNotifications extends PageElement {
  title = "Notifications";
  description = "Send desktop notifications to this system";

  readonly #send = new AtomController(this, () => sendNotification);

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

  private get isSending(): boolean {
    return this.#send.value.waiting;
  }

  private handleNavigateToConnection = (): void => {
    this.navigate("/connection");
  };

  private handleTitleInput = (
    e: Event & { target: HTMLInputElement },
  ): void => {
    this.notificationTitle = e.target.value;
  };

  private handleMessageInput = (
    e: Event & { target: HTMLInputElement },
  ): void => {
    this.notificationMessage = e.target.value;
  };

  private handleIconInput = (e: Event & { target: HTMLInputElement }): void => {
    this.notificationIcon = e.target.value;
  };

  private handleActionUrlInput = (
    e: Event & { target: HTMLInputElement },
  ): void => {
    this.notificationActionUrl = e.target.value;
  };

  private handleSoundInput = (
    e: Event & { target: HTMLInputElement },
  ): void => {
    this.notificationSound = e.target.value;
  };

  private buildNotificationData(): Notification {
    const optional = (value: string) => value.trim() || undefined;
    const icon = optional(this.notificationIcon);
    const actionUrl = optional(this.notificationActionUrl);
    const sound = optional(this.notificationSound);

    return {
      title: this.notificationTitle.trim(),
      message: this.notificationMessage.trim(),
      ...(icon && { icon }),
      ...(actionUrl && { actionUrl }),
      ...(sound && { sound }),
    };
  }

  private handleSendNotification = (): void => {
    if (!this.canSend) return;

    registry.set(sendNotification, this.buildNotificationData());
  };

  private clearForm = (): void => {
    this.notificationTitle = "";
    this.notificationMessage = "";
    this.notificationIcon = "";
    this.notificationActionUrl = "";
    this.notificationSound = "";
  };

  private get canSend(): boolean {
    return (
      !this.isSending &&
      !!this.notificationTitle.trim() &&
      !!this.notificationMessage.trim()
    );
  }

  private renderNotificationForm() {
    return html`
      <div class="space-y-6">
        <div class="rounded-lg border bg-card p-6 space-y-4">
          <h2 class="text-xl font-semibold">Send Notification</h2>
          <p class="text-sm text-muted-foreground">
            Send a desktop notification to this system. The notification will
            appear using the system's native notification system.
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
                ?disabled=${!this.canSend}
              >
                ${
                  this.isSending
                    ? html`<ui-icon
                        name="Loader2"
                        className="animate-spin mr-2"
                      ></ui-icon>`
                    : html`<ui-icon name="Bell" class="mr-2"></ui-icon>`
                }
                Send Notification
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
          ${this.renderPageHeader()}
          ${this.renderPageResult(
            actionResult(this.#send.value, "Notification sent successfully"),
          )}
          ${this.renderWithConnection(
            isConnected,
            "Please connect to System Bridge to send notifications.",
            this.handleNavigateToConnection,
            this.renderNotificationForm(),
          )}
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

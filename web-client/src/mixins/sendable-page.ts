import { state } from "lit/decorators.js";

import { generateUUID } from "~/lib/utils";

import { PageElement } from "./page-element";

const SEND_TIMEOUT_MS = 30000;

/**
 * Base class for pages that send WebSocket requests with timeout handling.
 * Provides shared state management for sending status, result display, and timeout cleanup.
 *
 * Subclasses get: `isSending`, `lastResult`, `pendingRequestId`, `sendTimeout`,
 * plus `showResult()`, `clearSendingState()`, `cleanupTimeout()`, and `sendWithTimeout()`.
 */
export class SendablePageElement extends PageElement {
  @state()
  protected isSending = false;

  @state()
  protected lastResult: { success: boolean; message: string } | null = null;

  @state()
  protected pendingRequestId: string | null = null;

  protected sendTimeout: number | null = null;

  protected showResult(success: boolean, message: string): void {
    this.lastResult = { success, message };
  }

  protected clearSendingState(): void {
    this.isSending = false;
    this.pendingRequestId = null;
    if (this.sendTimeout !== null) {
      clearTimeout(this.sendTimeout);
      this.sendTimeout = null;
    }
  }

  /** Clear the timeout only (for use in disconnectedCallback). */
  protected cleanupTimeout(): void {
    if (this.sendTimeout !== null) {
      clearTimeout(this.sendTimeout);
      this.sendTimeout = null;
    }
  }

  /**
   * Send a WebSocket request with automatic timeout and error handling.
   * Generates a unique request ID, sets sending state, and manages the 30s timeout.
   *
   * @param sendFn - Performs the actual send; receives the generated requestId
   * @param errorLabel - Error message to display and log on failure
   */
  protected sendWithTimeout(
    sendFn: (requestId: string) => void,
    errorLabel: string,
  ): void {
    this.isSending = true;
    const requestId = generateUUID();
    this.pendingRequestId = requestId;

    try {
      sendFn(requestId);

      this.sendTimeout = window.setTimeout(() => {
        if (this.isSending && this.pendingRequestId === requestId) {
          this.showResult(false, "Request timed out");
          this.clearSendingState();
        }
      }, SEND_TIMEOUT_MS);
    } catch (error) {
      console.error(errorLabel, error);
      this.showResult(false, errorLabel);
      this.clearSendingState();
    }
  }
}

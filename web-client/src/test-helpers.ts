import { fixture as baseFixture } from '@open-wc/testing';

/**
 * Creates a test fixture for a web component
 */
export const fixture = baseFixture;

/**
 * Mock WebSocket for testing
 */
export class MockWebSocket {
  readyState: number = WebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string): void {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Mock send - tests can override this
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper to simulate receiving a message
  simulateMessage(data: unknown): void {
    if (this.readyState === WebSocket.OPEN && this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // Helper to simulate error
  simulateError(): void {
    this.onerror?.(new Event('error'));
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 50,
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => {
      setTimeout(resolve, interval);
    });
  }
}

/**
 * Wait for the next update cycle
 */
export async function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

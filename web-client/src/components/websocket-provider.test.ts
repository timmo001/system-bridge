import { expect, fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import type { z } from 'zod';

import { connectionContext } from '~/contexts/connection';
import { CONNECTION_TIMEOUT } from '~/contexts/websocket';
import { MockWebSocket, waitFor } from '~/test-helpers';

import { WebSocketProvider } from './websocket-provider';

// Store original WebSocket
const OriginalWebSocket = globalThis.WebSocket;

describe('WebSocketProvider', () => {
  let mockWebSocket: MockWebSocket;
  let sentMessages: string[] = [];

  beforeEach(() => {
    // Reset state
    sentMessages = [];

    // Mock WebSocket
    mockWebSocket = new MockWebSocket('ws://localhost:9170/api/websocket');
    mockWebSocket.send = (data: string) => {
      sentMessages.push(data);
    };

    // @ts-expect-error - Mocking WebSocket for tests
    globalThis.WebSocket = class {
      constructor(url: string) {
        mockWebSocket = new MockWebSocket(url);
        mockWebSocket.send = (data: string) => {
          sentMessages.push(data);
        };
        return mockWebSocket;
      }
    };
  });

  afterEach(() => {
    // Restore original WebSocket
    globalThis.WebSocket = OriginalWebSocket;
  });

  describe('Connection', () => {
    it('should render without errors', async () => {
      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
      );
      expect(el).to.exist;
    });

    it('should not connect without connection settings', async () => {
      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
      );

      // Wait a bit to ensure no connection attempt
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      expect(sentMessages.length).to.equal(0);
    });

    it('should connect when connection settings are provided', async () => {
      // Create connection provider
      const connectionProvider = document.createElement('div');
      const provider = new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      // Simulate WebSocket opening
      await waitFor(() => mockWebSocket.onopen !== null);
      mockWebSocket.onopen?.(new Event('open'));

      // Wait for connection state update
      await waitFor(() => el['_isConnected'] === true, 2000);

      expect(el['_isConnected']).to.be.true;

      // Cleanup
      document.body.removeChild(connectionProvider);
    });

    it('should show error when host is missing', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: '',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      await el.updateComplete;

      expect(el['_error']).to.include('Connection settings are incomplete');

      document.body.removeChild(connectionProvider);
    });

    it('should show error when token is missing', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: '',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      await el.updateComplete;

      expect(el['_error']).to.include('API token is required');

      document.body.removeChild(connectionProvider);
    });
  });

  describe('Connection Timeout (Race Condition Fix)', () => {
    it('should timeout if connection takes too long', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      // Override MockWebSocket to NOT auto-connect
      // @ts-expect-error - Mocking WebSocket for tests
      globalThis.WebSocket = class {
        readyState = WebSocket.CONNECTING;
        url: string;
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;

        constructor(url: string) {
          this.url = url;
          mockWebSocket = this as unknown as MockWebSocket;
        }

        send() {
          // Do nothing
        }

        close() {
          this.readyState = WebSocket.CLOSED;
        }
      };

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      // Wait for timeout
      await new Promise((resolve) => {
        setTimeout(resolve, CONNECTION_TIMEOUT + 100);
      });

      expect(el['_error']).to.include('Connection timeout');

      document.body.removeChild(connectionProvider);
    });

    it('should not close connection if it opens before timeout', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      // Simulate connection opening quickly
      await waitFor(() => mockWebSocket.onopen !== null);
      mockWebSocket.onopen?.(new Event('open'));

      await waitFor(() => el['_isConnected'] === true);

      // Wait for what would be timeout period
      await new Promise((resolve) => {
        setTimeout(resolve, CONNECTION_TIMEOUT + 100);
      });

      // Should still be connected
      expect(el['_isConnected']).to.be.true;
      expect(el['_error']).to.be.null;

      document.body.removeChild(connectionProvider);
    });
  });

  describe('Message Handling', () => {
    it('should handle DATA_UPDATE messages', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      // Open connection
      await waitFor(() => mockWebSocket.onopen !== null);
      mockWebSocket.onopen?.(new Event('open'));
      await waitFor(() => el['_isConnected'] === true);

      // Send DATA_UPDATE message
      mockWebSocket.simulateMessage({
        type: 'DATA_UPDATE',
        module: 'battery',
        data: {
          isCharging: true,
          percentage: 85,
        },
      });

      await el.updateComplete;

      expect(el['_data'].battery).to.deep.include({
        isCharging: true,
        percentage: 85,
      });

      document.body.removeChild(connectionProvider);
    });

    it('should handle SETTINGS_RESULT messages', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      await waitFor(() => mockWebSocket.onopen !== null);
      mockWebSocket.onopen?.(new Event('open'));
      await waitFor(() => el['_isConnected'] === true);

      mockWebSocket.simulateMessage({
        type: 'SETTINGS_RESULT',
        data: {
          autostart: true,
          logLevel: 'DEBUG',
        },
      });

      await el.updateComplete;

      expect(el['_settings']).to.deep.include({
        autostart: true,
        logLevel: 'DEBUG',
      });

      document.body.removeChild(connectionProvider);
    });

    it('should handle ERROR messages with BAD_TOKEN', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'bad-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      await waitFor(() => mockWebSocket.onopen !== null);
      mockWebSocket.onopen?.(new Event('open'));
      await waitFor(() => el['_isConnected'] === true);

      mockWebSocket.simulateMessage({
        type: 'ERROR',
        subtype: 'BAD_TOKEN',
      });

      await el.updateComplete;

      expect(el['_error']).to.include('Invalid API token');
      expect(el['_isConnected']).to.be.false;

      document.body.removeChild(connectionProvider);
    });

    it('should set error for invalid JSON in message', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      await waitFor(() => mockWebSocket.onopen !== null);
      mockWebSocket.onopen?.(new Event('open'));
      await waitFor(() => el['_isConnected'] === true);

      // Simulate invalid JSON
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(
          new MessageEvent('message', { data: 'invalid json' }),
        );
      }

      await el.updateComplete;

      expect(el['_error']).to.include('invalid message');

      document.body.removeChild(connectionProvider);
    });
  });

  describe('Request/Response', () => {
    it('should send request when connected', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      await waitFor(() => mockWebSocket.onopen !== null);
      mockWebSocket.onopen?.(new Event('open'));
      await waitFor(() => el['_isConnected'] === true);

      // Clear previous messages
      sentMessages = [];

      el.sendRequest({
        id: 'test-id',
        event: 'TEST_EVENT',
        token: 'test-token',
      });

      expect(sentMessages.length).to.be.greaterThan(0);
      const lastMessage = JSON.parse(sentMessages[sentMessages.length - 1]);
      expect(lastMessage.event).to.equal('TEST_EVENT');

      document.body.removeChild(connectionProvider);
    });

    it('should handle request with response', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      await waitFor(() => mockWebSocket.onopen !== null);
      mockWebSocket.onopen?.(new Event('open'));
      await waitFor(() => el['_isConnected'] === true);

      // Create a simple schema for testing
      const schema = {
        safeParse: (data: unknown) => ({ success: true, data }),
      } as unknown as z.ZodType<{ result: string }>;

      const responsePromise = el.sendRequestWithResponse(
        {
          id: 'response-test-id',
          event: 'TEST_EVENT',
          token: 'test-token',
        },
        schema,
      );

      // Simulate response
      mockWebSocket.simulateMessage({
        id: 'response-test-id',
        type: 'RESPONSE',
        data: { result: 'success' },
      });

      const response = await responsePromise;
      expect(response).to.deep.equal({ result: 'success' });

      document.body.removeChild(connectionProvider);
    });
  });

  describe('Reconnection', () => {
    it('should attempt to reconnect after connection is lost', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      await waitFor(() => mockWebSocket.onopen !== null);
      mockWebSocket.onopen?.(new Event('open'));
      await waitFor(() => el['_isConnected'] === true);

      // Simulate connection close
      mockWebSocket.close();

      await el.updateComplete;

      expect(el['_isConnected']).to.be.false;
      expect(el['_retryCount']).to.be.greaterThan(0).and.lessThan(4);

      document.body.removeChild(connectionProvider);
    });

    it('should reset retry count on manual retry', async () => {
      const connectionProvider = document.createElement('div');
      new ContextProvider(connectionProvider, {
        context: connectionContext,
        initialValue: {
          host: 'localhost',
          port: '9170',
          ssl: false,
          token: 'test-token',
        },
      });
      document.body.appendChild(connectionProvider);

      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
        { parentNode: connectionProvider },
      );

      // Set retry count manually
      el['_retryCount'] = 5;

      el.retryConnection();

      expect(el['_retryCount']).to.equal(0);
      expect(el['_error']).to.be.null;

      document.body.removeChild(connectionProvider);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on disconnect', async () => {
      const el = await fixture<WebSocketProvider>(
        html`<websocket-provider></websocket-provider>`,
      );

      // Set some state
      el['_ws'] = mockWebSocket as unknown as WebSocket;
      el['_connectionTimeout'] = window.setTimeout(() => {}, 1000);

      // Trigger disconnect
      el.disconnectedCallback();

      expect(el['_ws']).to.be.null;
      expect(el['_connectionTimeout']).to.be.null;
    });
  });
});

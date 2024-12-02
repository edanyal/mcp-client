import { Transport, JSONRPCMessage } from '../types';

interface HttpSseOptions {
  serverUrl: string;
  headers?: Record<string, string>;
}

export class HttpSseTransport implements Transport {
  private serverUrl: string;
  private headers: Record<string, string>;
  private eventSource?: EventSource;
  
  onmessage?: (message: JSONRPCMessage) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;

  constructor(options: HttpSseOptions) {
    this.serverUrl = options.serverUrl;
    this.headers = options.headers || {};
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.serverUrl);

        this.eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.onmessage?.(message);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.onerror?.(new Error(`Failed to parse message: ${errorMessage}`));
          }
        };

        this.eventSource.onerror = () => {
          this.onerror?.(new Error('SSE connection error'));
        };

        this.eventSource.onopen = () => {
          resolve();
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        reject(new Error(`Failed to start transport: ${errorMessage}`));
      }
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    try {
      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send message: ${errorMessage}`);
    }
  }

  async close(): Promise<void> {
    this.eventSource?.close();
  }
}

export default HttpSseTransport;
import { Transport, JSONRPCMessage } from '../types';
import { createInterface, Interface } from 'readline';
import { Readable, Writable } from 'stream';

export class StdioTransport implements Transport {
  private readline: Interface | null = null;
  private input: Readable;
  private output: Writable;

  onmessage?: (message: JSONRPCMessage) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;

  constructor() {
    // Default to process stdin/stdout if no streams provided
    this.input = process.stdin;
    this.output = process.stdout;
    this.setupReadline();
  }

  setStreams(input: Readable, output: Writable) {
    // Clean up existing readline if it exists
    this.readline?.close();

    this.input = input;
    this.output = output;

    this.setupReadline();
  }

  private setupReadline() {
    this.readline = createInterface({
      input: this.input,
      output: this.output
    });

    this.readline.on('line', (line) => {
      try {
        const message = JSON.parse(line);
        this.onmessage?.(message);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.onerror?.(new Error(`Failed to parse message: ${errorMessage}`));
      }
    });

    this.readline.on('close', () => {
      this.onclose?.();
    });
  }

  async start(): Promise<void> {
    // Readline is set up in constructor or setStreams
  }

  async send(message: JSONRPCMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const line = JSON.stringify(message);
        this.output.write(line + '\n', (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        reject(new Error(`Failed to send message: ${errorMessage}`));
      }
    });
  }

  async close(): Promise<void> {
    this.readline?.close();
  }
}

export default StdioTransport;
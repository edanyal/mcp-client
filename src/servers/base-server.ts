import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  Transport,
  Tool,
  Resource,
  Prompt,
  ErrorCode
} from '../types';

export interface MCPServerOptions {
  transport: Transport;
  capabilities?: Record<string, any>;
}

export abstract class MCPServer extends EventEmitter {
  protected transport: Transport;
  protected capabilities: Record<string, any>;
  private initialized: boolean = false;

  constructor(options: MCPServerOptions) {
    super();
    this.transport = options.transport;
    this.capabilities = options.capabilities || {};

    this.transport.onmessage = this.handleMessage.bind(this);
    this.transport.onerror = this.handleError.bind(this);
    this.transport.onclose = this.handleClose.bind(this);
  }

  async start(): Promise<void> {
    await this.transport.start();
  }

  async stop(): Promise<void> {
    await this.transport.close();
  }

  protected async sendResponse(id: string | number, result: any): Promise<void> {
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      id,
      result
    };
    await this.transport.send(response);
  }

  protected async sendError(id: string | number, code: number, message: string, data?: any): Promise<void> {
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      id,
      error: { code, message, data }
    };
    await this.transport.send(response);
  }

  protected async sendNotification(method: string, params?: any): Promise<void> {
    await this.transport.send({
      jsonrpc: '2.0',
      method,
      params
    });
  }

  private async handleMessage(message: JSONRPCMessage): Promise<void> {
    if (!('method' in message)) {
      return;
    }

    try {
      switch (message.method) {
        case 'initialize':
          if (!this.initialized) {
            const result = await this.handleInitialize(message.params);
            if ('id' in message) {
              await this.sendResponse(message.id, result);
            }
            this.initialized = true;
          }
          break;

        case 'initialized':
          // Client notification that initialization is complete
          break;

        default:
          if (this.initialized) {
            await this.handleRequest(message as JSONRPCRequest);
          } else {
            throw new Error('Server not initialized');
          }
      }
    } catch (error) {
      if ('id' in message) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.sendError(message.id, ErrorCode.InternalError, errorMessage);
      }
    }
  }

  private handleError(error: Error): void {
    this.emit('error', error);
  }

  private handleClose(): void {
    this.emit('close');
  }

  // Abstract methods that must be implemented by concrete servers
  protected abstract handleInitialize(params: any): Promise<any>;
  protected abstract handleRequest(request: JSONRPCRequest): Promise<void>;

  // Optional methods that can be overridden
  protected async getTools(): Promise<Tool[]> {
    return [];
  }

  protected async getResources(): Promise<Resource[]> {
    return [];
  }

  protected async getPrompts(): Promise<Prompt[]> {
    return [];
  }

  protected validateRequest(request: JSONRPCRequest): void {
    if (!request.method) {
      throw new Error('Missing method');
    }
  }
}

export default MCPServer;
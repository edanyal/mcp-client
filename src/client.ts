import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  MCPClientOptions,
  Resource,
  Tool,
  Prompt,
  ErrorCode,
  Transport,
  SamplingRequest,
  SamplingResponse
} from './types';

export class MCPClient extends EventEmitter {
  private transport: Transport;
  private capabilities: Record<string, any>;
  private pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(options: MCPClientOptions) {
    super();
    this.transport = options.transport;
    this.capabilities = options.capabilities || {};

    this.transport.onmessage = this.handleMessage.bind(this);
    this.transport.onerror = this.handleError.bind(this);
    this.transport.onclose = this.handleClose.bind(this);
  }

  async connect(): Promise<void> {
    await this.transport.start();
    await this.initialize();
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  private async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '1.0',
      capabilities: this.capabilities
    });

    // Store server capabilities if provided
    if (response.capabilities) {
      Object.assign(this.capabilities, response.capabilities);
    }

    // Send initialized notification
    await this.sendNotification('initialized', {});
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    const id = uuidv4();
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.transport.send(request).catch(reject);
    });
  }

  private async sendNotification(method: string, params?: any): Promise<void> {
    await this.transport.send({
      jsonrpc: '2.0',
      method,
      params
    });
  }

  private handleMessage(message: JSONRPCMessage): void {
    if ('id' in message && message.id !== undefined) {
      // Handle response
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if ('error' in message && message.error) {
          pending.reject(new Error(message.error.message));
        } else if ('result' in message) {
          pending.resolve(message.result);
        }
      }
    } else if ('method' in message) {
      // Handle notification
      this.emit(message.method, message.params);
    }
  }

  private handleError(error: Error): void {
    this.emit('error', error);
  }

  private handleClose(): void {
    this.emit('close');
  }

  // Resource operations
  async listResources(): Promise<Resource[]> {
    return this.sendRequest('resources/list');
  }

  async readResource(uri: string): Promise<string | Buffer> {
    return this.sendRequest('resources/read', { uri });
  }

  async subscribeResource(uri: string): Promise<void> {
    return this.sendRequest('resources/subscribe', { uri });
  }

  async unsubscribeResource(uri: string): Promise<void> {
    return this.sendRequest('resources/unsubscribe', { uri });
  }

  // Tool operations
  async listTools(): Promise<Tool[]> {
    return this.sendRequest('tools/list');
  }

  async callTool(name: string, params: Record<string, any>): Promise<any> {
    return this.sendRequest('tools/call', { name, params });
  }

  // Prompt operations
  async listPrompts(): Promise<Prompt[]> {
    return this.sendRequest('prompts/list');
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<string> {
    return this.sendRequest('prompts/get', { name, args });
  }

  // Sampling operations
  async createSamplingMessage(request: SamplingRequest): Promise<SamplingResponse> {
    return this.sendRequest('sampling/createMessage', request);
  }
}

export default MCPClient;
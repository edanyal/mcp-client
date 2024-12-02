export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: any;
}

export interface JSONRPCRequestWithoutId {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

export type JSONRPCMessage = JSONRPCRequest | JSONRPCRequestWithoutId | JSONRPCResponse | JSONRPCNotification;

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface Prompt {
  name: string;
  description?: string;
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[];
}

export interface JSONSchema {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema: JSONSchema;
}

export interface MCPClientOptions {
  transport: Transport;
  capabilities?: Record<string, any>;
}

export interface Transport {
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}

export enum ErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603
}

export interface SamplingRequest {
  messages: {
    role: "user" | "assistant";
    content: {
      type: "text" | "image";
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }[];
  modelPreferences?: {
    hints?: {
      name?: string;
    }[];
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
  systemPrompt?: string;
  includeContext?: "none" | "thisServer" | "allServers";
  temperature?: number;
  maxTokens: number;
  stopSequences?: string[];
  metadata?: Record<string, any>;
}

export interface SamplingResponse {
  model: string;
  stopReason?: string;
  role: "user" | "assistant";
  content: {
    type: "text" | "image";
    text?: string;
    data?: string;
    mimeType?: string;
  };
}
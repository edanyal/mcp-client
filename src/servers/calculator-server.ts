import { MCPServer, MCPServerOptions } from './base-server';
import { JSONRPCRequest, Tool } from '../types';

export class CalculatorServer extends MCPServer {
  constructor(options: MCPServerOptions) {
    super(options);
  }

  protected async handleInitialize(params: any): Promise<any> {
    // Return server capabilities
    return {
      protocolVersion: '1.0',
      capabilities: {
        tools: ['calculator'],
        resources: [],
        prompts: []
      }
    };
  }

  protected async handleRequest(request: JSONRPCRequest): Promise<void> {
    this.validateRequest(request);

    switch (request.method) {
      case 'tools/list':
        if (request.id) {
          const tools = await this.getTools();
          await this.sendResponse(request.id, tools);
        }
        break;

      case 'tools/call':
        if (request.id && request.params) {
          const { name, params: toolParams } = request.params;
          
          if (name === 'calculator') {
            const result = await this.handleCalculation(toolParams);
            await this.sendResponse(request.id, result);
          } else {
            throw new Error(`Unknown tool: ${name}`);
          }
        }
        break;

      default:
        throw new Error(`Method not supported: ${request.method}`);
    }
  }

  protected async getTools(): Promise<Tool[]> {
    return [{
      name: 'calculator',
      description: 'Performs basic arithmetic calculations',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide']
          },
          a: {
            type: 'number'
          },
          b: {
            type: 'number'
          }
        },
        required: ['operation', 'a', 'b']
      }
    }];
  }

  private async handleCalculation(params: any): Promise<number> {
    const { operation, a, b } = params;

    switch (operation) {
      case 'add':
        return a + b;
      case 'subtract':
        return a - b;
      case 'multiply':
        return a * b;
      case 'divide':
        if (b === 0) {
          throw new Error('Division by zero');
        }
        return a / b;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}

export default CalculatorServer;
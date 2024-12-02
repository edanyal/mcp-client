import { Anthropic } from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import { MCPConnectionManager } from 'mcp-client';
import { resolve } from 'path';

config();

class MemoryApp {
  private anthropic: Anthropic;
  private manager: MCPConnectionManager;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });
    this.manager = new MCPConnectionManager();
  }

  async initialize() {
    await this.manager.initialize(resolve(__dirname, '../mcp-config.json'));
    console.log('Connected to Memory Server');

    // Get the memory client
    const memoryClient = this.manager.getClient('memory');
    if (!memoryClient) throw new Error('Failed to connect to memory server');

    // Get available tools
    const tools = await memoryClient.listTools();
    console.log('Available memory tools:', tools);
    
    // These should include:
    // - memory.createEntities
    // - memory.createRelations
    // - memory.addObservations
    // - memory.deleteEntities
    // - memory.deleteObservations
    // - memory.deleteRelations
    // - memory.readGraph
    // - memory.searchNodes
    // - memory.openNodes
    
    return tools;
  }

  async processUserInput(userInput: string): Promise<string> {
    const memoryClient = this.manager.getClient('memory');
    if (!memoryClient) throw new Error('Memory server not connected');

    // Get all tools for Claude
    const tools = await memoryClient.listTools();
    
    // Create message with tools
    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant with access to a memory/knowledge graph database through tools.
The tools allow you to:
- Create entities and relationships
- Add observations about entities
- Query the knowledge graph
- Delete items from the graph

When the user asks a question, first check if you need to:
1. Query existing knowledge using memory.searchNodes or memory.readGraph
2. Add new knowledge using memory.createEntities/memory.createRelations
3. Update knowledge using memory.addObservations
4. Remove incorrect knowledge using memory.deleteEntities/memory.deleteRelations

Always explain what you're doing with the memory operations.`
        },
        { role: 'user', content: userInput }
      ],
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema
      }))
    });

    // If Claude wants to use a tool
    if (!response.content[0].text && response.content[0].type === 'tool_call') {
      const toolCall = response.content[0].tool_calls[0];
      
      // Execute the memory tool
      const result = await memoryClient.callTool(
        toolCall.name,
        toolCall.parameters
      );

      // Send the result back to Claude
      const finalResponse = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: userInput },
          {
            role: 'assistant',
            content: '',
            tool_calls: [toolCall]
          },
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.name,
            content: JSON.stringify(result)
          }
        ],
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description || '',
          parameters: tool.inputSchema
        }))
      });

      return finalResponse.content[0].text;
    }

    return response.content[0].text;
  }

  async cleanup() {
    await this.manager.cleanup();
  }
}

// Example usage
async function main() {
  const app = new MemoryApp();
  
  try {
    await app.initialize();

    // Example interactions
    const responses = await Promise.all([
      // Create an entity
      app.processUserInput(
        "Create an entity for a person named 'John Smith' who is a software engineer"
      ),

      // Add some observations
      app.processUserInput(
        "Add an observation that John Smith works at Google"
      ),

      // Query the graph
      app.processUserInput(
        "What do we know about John Smith?"
      )
    ]);

    responses.forEach((response, i) => {
      console.log(`\nResponse ${i + 1}:`, response);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await app.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
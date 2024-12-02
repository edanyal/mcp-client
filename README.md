# MCP Client

A TypeScript implementation of a Model Context Protocol (MCP) client for LLM agents.

## Installation

```bash
npm install mcp-client
```

## Features

- Full implementation of the MCP specification
- Support for both stdio and HTTP+SSE transports
- Built-in MCP server process management
- Integration with Claude's native tool calling
- Type-safe API
- Event-based architecture
- Promise-based async/await API
- Support for all MCP operations:
  - Resources
  - Tools
  - Prompts
  - Sampling

## Usage

### Using with MCP Servers

The most common way to use MCP Client is with standard MCP servers via npx. Create a configuration file (`mcp-config.json`):

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory"
      ]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    },
    "brave-search": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-brave-search"
      ],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

Then use the MCPConnectionManager to connect to your servers:

```typescript
import { MCPConnectionManager } from 'mcp-client';

const manager = new MCPConnectionManager();
await manager.initialize('./mcp-config.json');

// Get clients for specific servers
const memoryClient = manager.getClient('memory');
const fsClient = manager.getClient('filesystem');

// Use tools from the servers
const memoryTools = await memoryClient?.listTools();
const fsTools = await fsClient?.listTools();

// Clean up when done
await manager.cleanup();
```

### Integration with Claude

The client is designed to work seamlessly with Claude's native tool calling:

```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import { MCPConnectionManager } from 'mcp-client';

// Initialize Claude and MCP
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const manager = new MCPConnectionManager();
await manager.initialize('./mcp-config.json');

// Get a client
const memoryClient = manager.getClient('memory');
const tools = await memoryClient?.listTools();

// Use with Claude
const response = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'your prompt' }],
  tools: tools?.map(tool => ({
    name: tool.name,
    description: tool.description || '',
    parameters: tool.inputSchema
  }))
});

// Handle tool calls
if (!response.content[0].text && response.content[0].type === 'tool_call') {
  const toolCall = response.content[0].tool_calls[0];
  const result = await memoryClient?.callTool(
    toolCall.name,
    toolCall.parameters
  );
  // Send result back to Claude...
}
```

### Low-level Usage

If you need more control, you can use the client directly:

```typescript
import { MCPClient, StdioTransport } from 'mcp-client';

// Create a transport
const transport = new StdioTransport();

// Create and connect client
const client = new MCPClient({ transport });
await client.connect();

// List available tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool('tool-name', {
  // tool parameters
});
```

## Available MCP Servers

Common MPC servers available via npx:

- `@modelcontextprotocol/server-memory` - Knowledge graph operations
- `@modelcontextprotocol/server-filesystem` - File system operations
- `@modelcontextprotocol/server-brave-search` - Web search capabilities
- `@modelcontextprotocol/server-puppeteer` - Web automation
- `@modelcontextprotocol/server-fetch` - HTTP requests
- And many more...

## Examples

Check the `/examples` directory for complete examples:

- `memory-app` - Using the Memory Server for knowledge graph operations
- `llm-app` - Basic LLM app with MCP tools
- `llm-app-tools` - Advanced LLM app with Claude native tool calling

## API Reference

### MCPConnectionManager

```typescript
class MCPConnectionManager {
  initialize(configPath: string): Promise<void>;
  getClient(serverName: string): MCPClient | undefined;
  cleanup(): Promise<void>;
}
```

### MCPClient

```typescript
class MCPClient {
  constructor(options: MCPClientOptions);
  
  // Connection
  connect(): Promise<void>;
  close(): Promise<void>;
  
  // Tools
  listTools(): Promise<Tool[]>;
  callTool(name: string, params: Record<string, any>): Promise<any>;
  
  // Resources
  listResources(): Promise<Resource[]>;
  readResource(uri: string): Promise<string | Buffer>;
  
  // Prompts
  listPrompts(): Promise<Prompt[]>;
  getPrompt(name: string, args?: Record<string, any>): Promise<string>;
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
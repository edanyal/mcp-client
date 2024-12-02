import { MCPClient, StdioTransport } from './index';

async function main() {
  // Create a transport (stdio in this example)
  const transport = new StdioTransport();
  
  // Create the MCP client
  const client = new MCPClient({
    transport,
    capabilities: {
      // Declare any client capabilities here
      supportedProtocolVersion: '1.0'
    }
  });

  // Set up event handlers
  client.on('error', (error) => {
    console.error('Client error:', error);
  });

  client.on('close', () => {
    console.log('Client connection closed');
  });

  try {
    // Connect to the server
    await client.connect();
    console.log('Connected to MCP server');

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', tools);

    // List available resources
    const resources = await client.listResources();
    console.log('Available resources:', resources);

    // Example of calling a tool
    if (tools.length > 0) {
      const result = await client.callTool(tools[0].name, {
        // Tool parameters here
      });
      console.log('Tool result:', result);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up
    await client.close();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
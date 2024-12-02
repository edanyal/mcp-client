import { MCPClient, StdioTransport } from './index';
import { CalculatorServer } from './servers/calculator-server';

async function main() {
  // Create transports for both client and server
  const clientTransport = new StdioTransport();
  const serverTransport = new StdioTransport();

  // Create server and client
  const server = new CalculatorServer({ transport: serverTransport });
  const client = new MCPClient({ transport: clientTransport });

  // Set up error handlers
  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  client.on('error', (error) => {
    console.error('Client error:', error);
  });

  try {
    // Start server and connect client
    await server.start();
    await client.connect();

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', tools);

    // Use the calculator tool
    const result = await client.callTool('calculator', {
      operation: 'add',
      a: 5,
      b: 3
    });
    console.log('Calculation result:', result); // Should print 8

    // Try another calculation
    const result2 = await client.callTool('calculator', {
      operation: 'multiply',
      a: 4,
      b: 6
    });
    console.log('Calculation result 2:', result2); // Should print 24

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up
    await client.close();
    await server.stop();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
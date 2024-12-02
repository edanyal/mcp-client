import { spawn, ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import { MCPClient } from '../client';
import { StdioTransport } from '../transports/stdio';

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export class MCPConnectionManager {
  private clients: Map<string, MCPClient> = new Map();
  private processes: Map<string, ChildProcess> = new Map();

  async connectToServer(serverName: string, config: MCPServerConfig): Promise<MCPClient> {
    // Spawn the server process
    const serverProcess = spawn(config.command, config.args, {
      env: {
        ...process.env,
        ...config.env
      },
      stdio: ['pipe', 'pipe', 'pipe']  // stdin, stdout, stderr
    });

    // Create transport using the process stdio
    const transport = new StdioTransport();
    // Fix the order: input, output, error
    transport.setStreams(serverProcess.stdout, serverProcess.stdin);

    // Create and connect client
    const client = new MCPClient({ transport });
    await client.connect();

    // Store references
    this.clients.set(serverName, client);
    this.processes.set(serverName, serverProcess);

    // Handle process errors and exit
    serverProcess.on('error', (error) => {
      console.error(`Server ${serverName} error:`, error);
    });

    serverProcess.on('exit', (code, signal) => {
      console.log(`Server ${serverName} exited with code ${code} and signal ${signal}`);
      this.clients.delete(serverName);
      this.processes.delete(serverName);
    });

    return client;
  }

  async initialize(configPath: string) {
    try {
      // Load config
      const config: MCPConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

      // Connect to each configured server
      for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        try {
          await this.connectToServer(serverName, serverConfig);
          console.log(`Successfully connected to ${serverName} server`);
        } catch (error) {
          console.error(`Failed to connect to ${serverName} server:`, error);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize MCP connections: ${errorMessage}`);
    }
  }

  getClient(serverName: string): MCPClient | undefined {
    return this.clients.get(serverName);
  }

  async cleanup() {
    // Clean up all connections
    for (const [serverName, client] of this.clients.entries()) {
      try {
        await client.close();
        const process = this.processes.get(serverName);
        if (process) {
          process.kill();
        }
      } catch (error) {
        console.error(`Error cleaning up ${serverName}:`, error);
      }
    }

    this.clients.clear();
    this.processes.clear();
  }
}
#!/usr/bin/env ts-node

/**
 * Script to generate comprehensive IPC endpoint documentation
 * Parses all IPC handlers and creates a contract specification
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';

interface IPCEndpoint {
  channel: string;
  handler: string;
  params: string[];
  returns: string;
  description?: string;
  errors?: string[];
  example?: string;
}

class IPCDocumentationGenerator {
  private endpoints: IPCEndpoint[] = [];
  private handlersPath = path.join(__dirname, '../src/main/ipc/handlers');
  private outputPath = path.join(__dirname, '../docs/api/ipc-contracts.md');

  async generate(): Promise<void> {
    console.log('🔍 Scanning IPC handlers...');
    await this.scanHandlers();

    console.log(`📝 Found ${this.endpoints.length} IPC endpoints`);
    await this.generateDocumentation();

    console.log(`✅ Documentation generated at ${this.outputPath}`);
  }

  private async scanHandlers(): Promise<void> {
    const handlerFiles = glob.sync('**/*.ts', {
      cwd: this.handlersPath,
      ignore: ['**/*.test.ts', '**/*.spec.ts', 'index.ts']
    });

    for (const file of handlerFiles) {
      const filePath = path.join(this.handlersPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      this.parseHandler(content, file);
    }
  }

  private parseHandler(content: string, fileName: string): void {
    // Extract handler class name
    const classMatch = content.match(/export class (\w+Handler)/);
    const className = classMatch ? classMatch[1] : path.basename(fileName, '.ts');

    // Extract prefix
    const prefixMatch = content.match(/super\(['"](\w+)['"]\)/);
    const prefix = prefixMatch ? prefixMatch[1] : '';

    // Find all handle calls
    const handleRegex = /this\.handle<([^>]+)>?\s*\(\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = handleRegex.exec(content)) !== null) {
      const types = match[1] || '';
      const channel = match[2];
      const fullChannel = prefix ? `${prefix}:${channel}` : channel;

      // Extract parameter and return types
      const typeMatch = types.match(/\[([^\]]*)\],\s*(.+)/);
      const params = typeMatch ? typeMatch[1].split(',').map(p => p.trim()) : [];
      const returns = typeMatch ? typeMatch[2].trim() : 'any';

      this.endpoints.push({
        channel: fullChannel,
        handler: className,
        params,
        returns,
        description: this.extractDescription(content, channel),
        errors: this.extractErrors(content, channel)
      });
    }
  }

  private extractDescription(content: string, channel: string): string {
    // Look for comment above the handler
    const regex = new RegExp(`\\/\\/\\s*(.+)\\s*\\n\\s*this\\.handle[^']*['"]${channel}['"]`, 'g');
    const match = regex.exec(content);
    return match ? match[1] : '';
  }

  private extractErrors(content: string, channel: string): string[] {
    // Look for thrown errors in the handler
    const errors: string[] = [];
    const handlerStart = content.indexOf(`'${channel}'`);
    if (handlerStart === -1) return errors;

    const handlerEnd = content.indexOf('});', handlerStart);
    const handlerBody = content.substring(handlerStart, handlerEnd);

    const errorMatches = handlerBody.matchAll(/throw [^;]+Error\(['"]([^'"]+)['"]/g);
    for (const match of errorMatches) {
      errors.push(match[1]);
    }

    return errors;
  }

  private async generateDocumentation(): Promise<void> {
    const grouped = this.groupByHandler();

    let markdown = `# IPC Contract Documentation

Generated on: ${new Date().toISOString()}

## Overview

This document describes all IPC (Inter-Process Communication) endpoints available in the MCP Configuration Manager.

## Endpoints by Handler

`;

    for (const [handler, endpoints] of Object.entries(grouped)) {
      markdown += `### ${handler}\n\n`;

      for (const endpoint of endpoints) {
        markdown += `#### \`${endpoint.channel}\`\n\n`;

        if (endpoint.description) {
          markdown += `${endpoint.description}\n\n`;
        }

        markdown += `**Parameters:**\n`;
        if (endpoint.params.length > 0) {
          markdown += endpoint.params.map((p, i) => `- \`${p}\``).join('\n');
        } else {
          markdown += '- None';
        }
        markdown += '\n\n';

        markdown += `**Returns:** \`${endpoint.returns}\`\n\n`;

        if (endpoint.errors && endpoint.errors.length > 0) {
          markdown += `**Possible Errors:**\n`;
          markdown += endpoint.errors.map(e => `- ${e}`).join('\n');
          markdown += '\n\n';
        }

        markdown += '---\n\n';
      }
    }

    // Add TypeScript contract interface
    markdown += await this.generateTypeScriptContract();

    await fs.ensureDir(path.dirname(this.outputPath));
    await fs.writeFile(this.outputPath, markdown);
  }

  private groupByHandler(): Record<string, IPCEndpoint[]> {
    const grouped: Record<string, IPCEndpoint[]> = {};

    for (const endpoint of this.endpoints) {
      if (!grouped[endpoint.handler]) {
        grouped[endpoint.handler] = [];
      }
      grouped[endpoint.handler].push(endpoint);
    }

    return grouped;
  }

  private async generateTypeScriptContract(): Promise<string> {
    let contract = `## TypeScript Contract Definition

\`\`\`typescript
export interface IPCContracts {
`;

    for (const endpoint of this.endpoints) {
      const paramType = endpoint.params.length > 0
        ? `[${endpoint.params.join(', ')}]`
        : 'void';

      contract += `  '${endpoint.channel}': {
    params: ${paramType};
    returns: ${endpoint.returns};
  };
`;
    }

    contract += `}

// Type-safe IPC invoke helper
export async function invokeIPC<K extends keyof IPCContracts>(
  channel: K,
  ...args: IPCContracts[K]['params'] extends void ? [] : [IPCContracts[K]['params']]
): Promise<IPCContracts[K]['returns']> {
  return window.electron.invoke(channel, ...args);
}
\`\`\``;

    return contract;
  }
}

// Run the generator
const generator = new IPCDocumentationGenerator();
generator.generate().catch(console.error);
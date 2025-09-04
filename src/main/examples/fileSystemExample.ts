/**
 * Example usage of file system utilities and path resolution
 * This file demonstrates how to use the utilities for MCP configuration management
 */

import { MacOSPathResolver, FileSystemUtils } from '../utils';
import { ClientType, ConfigScope } from '../../shared/types';

export async function demonstrateFileSystemUtilities() {
  console.log('=== MCP Configuration Manager File System Utilities Demo ===\n');

  // 1. Path Resolution Examples
  console.log('1. Path Resolution:');
  
  // Get paths for different MCP clients
  const claudeDesktopPaths = MacOSPathResolver.getClientConfigurationPaths(ClientType.CLAUDE_DESKTOP);
  console.log('Claude Desktop primary config:', claudeDesktopPaths.primary);
  console.log('Claude Desktop user scope:', claudeDesktopPaths.scopePaths[ConfigScope.USER]);
  
  const claudeCodePaths = MacOSPathResolver.getClientConfigurationPaths(ClientType.CLAUDE_CODE);
  console.log('Claude Code primary config:', claudeCodePaths.primary);
  console.log('Claude Code alternatives:', claudeCodePaths.alternatives);
  
  // Path expansion and resolution
  const tildePath = '~/Documents/my-config.json';
  const expandedPath = MacOSPathResolver.expandTildeInPath(tildePath);
  console.log('Expanded path:', expandedPath);
  
  const absolutePath = MacOSPathResolver.resolveAbsolutePath('./relative-config.json');
  console.log('Absolute path:', absolutePath);
  
  console.log('\n2. File Operations:');
  
  // 2. Configuration File Operations
  const configPath = '/tmp/demo-mcp-config.json';
  const sampleConfig = {
    mcpServers: {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        "env": {
          "DEBUG": "1"
        }
      },
      "git": {
        "command": "npx", 
        "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "."],
        "env": {}
      }
    }
  };

  try {
    // Write configuration
    console.log('Writing configuration to:', configPath);
    await FileSystemUtils.writeJsonFile(configPath, sampleConfig);
    
    // Read configuration back
    console.log('Reading configuration...');
    const readConfig = await FileSystemUtils.readJsonFile(configPath);
    console.log('Servers found:', Object.keys(readConfig.mcpServers));
    
    // Get file stats
    const stats = await FileSystemUtils.getFileStats(configPath);
    console.log('File size:', stats.size, 'bytes');
    console.log('Last modified:', stats.modified.toISOString());
    
    // Update configuration (creates backup automatically)
    console.log('\nUpdating configuration...');
    const updatedConfig = {
      ...sampleConfig,
      mcpServers: {
        ...sampleConfig.mcpServers,
        "memory": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-memory"],
          "env": {}
        }
      }
    };
    
    await FileSystemUtils.writeJsonFile(configPath, updatedConfig);
    console.log('Configuration updated with memory server');
    
    // List backups
    const backups = await FileSystemUtils.listBackups(configPath);
    console.log('Backups created:', backups.length);
    if (backups.length > 0) {
      console.log('Latest backup:', backups[0].path);
      console.log('Backup timestamp:', backups[0].timestamp.toISOString());
    }
    
    // Demonstrate error handling
    console.log('\n3. Error Handling:');
    
    try {
      await FileSystemUtils.readJsonFile('/nonexistent/path/config.json');
    } catch (error: any) {
      console.log('Expected error for non-existent file:', error.name);
    }
    
    // Clean up
    console.log('\nCleaning up demo files...');
    await FileSystemUtils.cleanupOldBackups(0, 0); // Remove all backups
    
    console.log('Demo completed successfully!');
    
  } catch (error: any) {
    console.error('Demo failed:', error.message);
    throw error;
  }
}

// Example of handling different client configurations
export async function demonstrateClientSpecificPaths() {
  console.log('\n=== Client-Specific Path Resolution ===\n');
  
  const clients = [
    ClientType.CLAUDE_DESKTOP,
    ClientType.CLAUDE_CODE,
    ClientType.CODEX,
    ClientType.VS_CODE,
    ClientType.GEMINI_DESKTOP,
    ClientType.GEMINI_CLI
  ];
  
  for (const clientType of clients) {
    console.log(`${clientType.toUpperCase()}:`);
    const paths = MacOSPathResolver.getClientConfigurationPaths(clientType);
    console.log(`  Primary: ${paths.primary}`);
    console.log(`  Alternatives: ${paths.alternatives.length} paths`);
    console.log(`  User scope: ${paths.scopePaths[ConfigScope.USER]}`);
    console.log(`  Project scope: ${paths.scopePaths[ConfigScope.PROJECT]}`);
    console.log('');
  }
}

// Example of error recovery
export async function demonstrateErrorRecovery() {
  console.log('\n=== Error Recovery Demo ===\n');
  
  const testConfigPath = '/tmp/error-recovery-test.json';
  
  try {
    // Create a valid configuration
    const validConfig = { mcpServers: { test: { command: "echo" } } };
    await FileSystemUtils.writeJsonFile(testConfigPath, validConfig);
    console.log('Created valid configuration');
    
    // Simulate corruption by writing invalid JSON
    const fs = require('fs-extra');
    await fs.writeFile(testConfigPath, '{ invalid json content }');
    console.log('Simulated file corruption');
    
    // Try to read corrupted file
    try {
      await FileSystemUtils.readJsonFile(testConfigPath);
    } catch (error: any) {
      console.log('Detected corruption:', error.name);
      
      // Restore from backup
      const backups = await FileSystemUtils.listBackups(testConfigPath);
      if (backups.length > 0) {
        console.log('Restoring from backup...');
        await FileSystemUtils.restoreFromBackup(backups[0].path, testConfigPath);
        
        // Verify restoration
        const restoredConfig = await FileSystemUtils.readJsonFile(testConfigPath);
        console.log('Successfully restored configuration');
        console.log('Servers in restored config:', Object.keys(restoredConfig.mcpServers));
      }
    }
    
  } catch (error: any) {
    console.error('Error recovery demo failed:', error.message);
  }
}

// Run demos if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      await demonstrateFileSystemUtilities();
      await demonstrateClientSpecificPaths();
      await demonstrateErrorRecovery();
    } catch (error) {
      console.error('Demo execution failed:', error);
      process.exit(1);
    }
  })();
}
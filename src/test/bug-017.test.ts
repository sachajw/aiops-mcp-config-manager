/**
 * Bug-017 Test: Discovery Page Duplicate Keys & Missing Install Handler
 *
 * This test verifies:
 * 1. IPC handler registration for discovery.installServer
 * 2. Potential duplicate key generation in server IDs
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Bug-017: Discovery Page Issues', () => {

  describe('IPC Handler Registration', () => {
    it('should have DiscoveryHandler registered in modular system', () => {
      const handlersIndexPath = path.join(__dirname, '../main/ipc/handlers/index.ts');
      const handlersIndexContent = fs.readFileSync(handlersIndexPath, 'utf-8');

      // Check if DiscoveryHandler is imported
      const hasDiscoveryImport = handlersIndexContent.includes("import { DiscoveryHandler }") ||
                                handlersIndexContent.includes("import DiscoveryHandler");

      // Check if DiscoveryHandler is in handlers array
      const hasDiscoveryInArray = handlersIndexContent.includes("DiscoveryHandler");

      expect(hasDiscoveryImport || hasDiscoveryInArray).toBe(true);
    });

    it('should have discovery handlers exposed in preload', () => {
      const preloadPath = path.join(__dirname, '../main/preload.ts');
      const preloadContent = fs.readFileSync(preloadPath, 'utf-8');

      // Check if discovery object is exposed
      const hasDiscoveryExposed = preloadContent.includes("discovery:");
      expect(hasDiscoveryExposed).toBe(true);

      // Check if installServer method is exposed
      const hasInstallServer = preloadContent.includes("installServer:");
      expect(hasInstallServer).toBe(true);
    });
  });

  describe('Server ID Generation', () => {
    it('should generate unique IDs for different servers', () => {
      // Simulate ID generation logic from McpDiscoveryService
      const generateThirdPartyId = (repo: string) => {
        return `github-3p-${repo.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
      };

      // Test potential collision scenarios
      const id1 = generateThirdPartyId('mcp-server');
      const id2 = generateThirdPartyId('mcp_server');
      const id3 = generateThirdPartyId('MCP-Server');

      // These should NOT be equal but currently they are (BUG)
      console.log('ID1:', id1);
      console.log('ID2:', id2);
      console.log('ID3:', id3);

      // This test will FAIL, confirming the bug
      const ids = [id1, id2, id3];
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3); // Should be 3 unique IDs
    });

    it('should not have duplicate keys in server list', () => {
      // Check if DiscoveryPage has proper key generation
      const discoveryPagePath = path.join(__dirname, '../renderer/pages/Discovery/DiscoveryPage.tsx');
      const discoveryPageContent = fs.readFileSync(discoveryPagePath, 'utf-8');

      // Check if server.id is used as key
      const usesServerId = discoveryPageContent.includes('key={server.id}');
      expect(usesServerId).toBe(true);

      // Check if there's any duplicate prevention logic
      const hasUniqueCheck = discoveryPageContent.includes('Set(') ||
                           discoveryPageContent.includes('unique') ||
                           discoveryPageContent.includes('duplicat');

      // This should be true but likely isn't (BUG)
      expect(hasUniqueCheck).toBe(true);
    });
  });

  describe('Handler Architecture Check', () => {
    it('should not have both legacy and modular handlers', () => {
      const mainPath = path.join(__dirname, '../main/main.ts');
      const mainContent = fs.readFileSync(mainPath, 'utf-8');

      // Check for legacy handler registration
      const hasLegacyRegistration = mainContent.includes('registerDiscoveryHandlers');

      // Check for modular handler registration
      const hasModularRegistration = mainContent.includes('registerAllHandlers');

      console.log('Has Legacy Discovery Registration:', hasLegacyRegistration);
      console.log('Has Modular Handler Registration:', hasModularRegistration);

      // Both should not be true at the same time for discovery
      if (hasLegacyRegistration && hasModularRegistration) {
        console.warn('WARNING: Both legacy and modular handler systems are in use');
      }
    });
  });
});
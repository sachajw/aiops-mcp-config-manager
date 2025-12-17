# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Configuration Manager is a desktop application for managing Model Context Protocol (MCP) server configurations across multiple AI clients (Claude Desktop, Claude Code, VS Code, Cursor, Windsurf, Kiro, Codex, Gemini). Built with Electron + React + TypeScript.

## Development Commands

```bash
# Development (recommended)
npm run electron:dev     # Start Vite + Electron with hot reload

# Build & Package
npm run build            # Build for production
npm run electron:pack    # Package for current platform (in release/)
npm run electron:dist    # Create distributable packages

# Testing
npm test                 # Run Jest unit tests
npm run test:watch       # Watch mode
npm run test:e2e         # End-to-end tests
npm test -- --testNamePattern="test name"  # Single test

# Code Quality
npm run lint             # ESLint
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier formatting
npm run type-check       # TypeScript check (no emit)
```

## Architecture

### Process Layers
- **Main Process** (`src/main/`): Electron main handling file system, IPC, OS integration
- **Renderer Process** (`src/renderer/`): React frontend with Ant Design components
- **Shared** (`src/shared/`): Types, constants, utilities shared between processes

### Core Services (`src/main/services/`)
- `ConfigurationService`: Config CRUD operations orchestration
- `ConfigurationParser`: JSON/JSON5/JSONC parsing
- `ValidationEngine`: MCP server and command validation
- `ClientDetector`: Discovers installed AI clients
- `MCPClient`: Native MCP protocol (JSON-RPC) communication
- `ConnectionMonitor`: Real-time health checks, auto-reconnect
- `MetricsService`: Live tool counts, response times, connection status
- `ServerCatalogService`: 100+ MCP ecosystem servers

### IPC Handlers (`src/main/ipc/handlers/`)
Handlers are prefixed by domain:
- `clients:` - Client discovery and management
- `config:` - Configuration CRUD
- `server:` - Server testing and validation
- `metrics:` - Monitoring data
- `catalog:` - Server catalog operations
- `connection:` - Connection monitoring
- `mcp:` - MCP server inspection

### State Management
Four Zustand stores in `src/renderer/store/`:
- `applicationStore.ts` - Core app state (clients, servers, configs)
- `settingsStore.ts` - User preferences
- `uiStore.ts` - UI state (modals, selections)
- `performanceStore.ts` - Metrics and performance data

### Path Aliases
```typescript
@/shared/*   -> src/shared/*
@/renderer/* -> src/renderer/*
@/main/*     -> src/main/*
```

## Configuration Paths

**Scope hierarchy** (project > local > user > global):
- Global: `/etc/mcp/config.json`
- User: `~/.config/mcp/config.json`
- Local: `./.mcp/config.json`
- Project: `./project.mcp.json`

**Client configs** (macOS):
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude Code: `~/.claude/claude_code_config.json`
- VS Code: Workspace/user settings
- Cursor: `~/Library/Application Support/Cursor/User/globalStorage/cursor.mcp/config.json`
- Windsurf: `~/.codeium/windsurf/mcp_config.json`

## Code Conventions

### CRITICAL: No Fallback Anti-Pattern

```javascript
// BANNED - masks failures with false success:
value || 0           // Shows 0 when undefined
value || false       // Shows false when undefined
value || ""          // Shows empty string when undefined
value || []          // Shows empty array when undefined

// REQUIRED:
value ?? '—'                                    // Nullish coalescing
typeof value === 'number' ? value : '—'        // Explicit type check
value === true / value === false               // Explicit boolean check
```

### Engineering Approach
- Fix existing code before creating new logic
- No mock data or hardcoded data for frontend display
- TDD approach for new features
- Value simplicity over complexity
- Update `.kiro/specs/mcp-config-manager/tasks.md` when tasks complete

### IPC Development
- Frontend: Reference `/docs/api/ipc-contracts.md` before making IPC calls
- Backend: Update `/docs/api/ipc-contracts.md` immediately when adding/modifying handlers
- Use dependency injection via container: `container.get<ServiceType>('serviceName')`

## Project Planning

All planning documents are in `.kiro/specs/mcp-config-manager/`:
- **Task tracking**: `tasks.md` (source of truth)
- **Sprint details**: `sprints/sprint-*.md`
- **Architecture**: `architecture/`
- **Requirements**: `requirements.md`

**Steering files** (`.kiro/steering/`):
- `product.md` - Project purpose and focus
- `structure.md` - File organization and patterns
- `tech.md` - Technology decisions and build commands

## Context Loading by Work Area

When working on specific areas, load these context files:
- **Visual Workspace**: `.kiro/CONTEXT-VISUAL-WORKSPACE.md`, focus on `src/renderer/components/VisualWorkspace/`
- **Backend Services**: `.kiro/CONTEXT-BACKEND-SERVICES.md`, focus on `src/main/services/`
- **IPC**: `.kiro/CONTEXT-IPC.md`, reference `/docs/api/ipc-contracts.md`
- **Store**: `src/renderer/store/applicationStore.ts`

## Behavioral Guidelines

- Admit uncertainty rather than guessing
- When experiencing repeated regressions, consult Gemini or Codex CLIs for additional perspective
- Run `npm run type-check && npm test` before marking tasks complete

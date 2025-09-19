# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Configuration Manager (MCM) is a unified desktop application for managing Model Context Protocol (MCP) server configurations across multiple AI client applications. It eliminates manual JSON editing and provides a centralized interface with form-based editing, validation, scope management, and cross-client synchronization.

## Development Commands

**Start development (recommended):**
```bash
npm run electron:dev
```
This starts both the Vite dev server and Electron with hot reloading.

**Other development commands:**
- `npm run dev` - Start both renderer and main process development servers
- `npm run dev:renderer` - Start Vite dev server only (localhost:5173)
- `npm run dev:main` - Build and run Electron main process

**Build and package:**
- `npm run build` - Build both renderer and main process for production
- `npm run electron:pack` - Package app for current platform (in `release/` directory)
- `npm run electron:dist` - Create distributable packages

**Testing:**
- `npm test` - Run unit tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run end-to-end tests
- Single test: `npm test -- --testNamePattern="test name"`

**Code quality:**
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking without emitting files

## Architecture

This is an Electron application with React frontend for managing Model Context Protocol (MCP) server configurations across multiple AI clients (Claude Desktop, Claude Code, Codex, VS Code, Gemini Desktop, Gemini CLI).

**Technology stack:**
- **Desktop**: Electron 28+ with secure IPC communication
- **Frontend**: React 18 + TypeScript with Ant Design components
- **State**: Zustand for lightweight state management
- **Editor**: Monaco Editor for JSON editing with syntax highlighting
- **Files**: fs-extra for file operations, chokidar for file monitoring
- **Config**: JSON5 for flexible configuration parsing with comments

**Key architectural layers:**
1. **Main Process** (`src/main/`): Electron main process handling file system operations, IPC, and OS integration
2. **Renderer Process** (`src/renderer/`): React frontend with component-based UI
3. **Shared** (`src/shared/`): Type definitions, constants, and utilities shared between processes

**Core services** (in `src/main/services/`):
- `ConfigurationService`: Main orchestration service for config operations
- `ConfigurationParser`: Handles parsing different config formats (JSON, JSON5, JSONC)
- `ValidationEngine`: Validates MCP server configurations and commands
- `ClientDetector`: Discovers and validates installed MCP clients
- `MCPClient`: Native MCP protocol client with JSON-RPC communication
- `ConnectionMonitor`: Real-time server health monitoring and auto-reconnect
- `MetricsService`: Live metrics collection for tools, resources, and performance
- `ServerCatalogService`: MCP ecosystem server catalog with 100+ servers

**Configuration scope hierarchy** (project > local > user > global):
- **Global**: `/etc/mcp/config.json` (system-wide)
- **User**: `~/.config/mcp/config.json` (user-specific)
- **Local**: `./.mcp/config.json` (directory-specific)
- **Project**: `./project.mcp.json` (project-specific)

**MCP client configuration paths:**
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Code**: `~/.claude/claude_code_config.json`
- **Codex**: `~/.codex/config.json` or `~/Library/Application Support/Codex/config.json`
- **VS Code**: Workspace/user settings
- **Gemini Desktop**: `~/Library/Application Support/Gemini/config.json`
- **Gemini CLI**: `~/.gemini/config.json`

**Path resolution**: Uses `@/` imports with TypeScript path mapping:
- `@/shared/*` → `src/shared/*`
- `@/renderer/*` → `src/renderer/*` 
- `@/main/*` → `src/main/*`

**Testing setup**: Jest with separate configs for unit tests (jsdom) and e2e tests (node environment), includes React Testing Library.

## Implementation Status

**Current Phase**: Real MCP Implementation Complete ✓

**Core Functionality**: 100% complete with native MCP protocol

**Completed Features:**
- **Native MCP Protocol** (Tasks 50-53): Full JSON-RPC implementation with real server connections
- **Live Server Monitoring**: Real-time health checks, metrics, and connection status
- **Visual Workspace**: Interactive drag-and-drop canvas with React Flow
- **Multi-Client Support**: 8+ clients including Claude Desktop, VS Code, Cursor, Windsurf
- **Server Discovery**: Catalog of 100+ MCP servers with installation support
- **75+ React Components**: Full TypeScript coverage with strict mode
- **4 Zustand Stores**: Comprehensive state management
- **Complete Error Handling**: Recovery system with automatic backups
- **Settings System**: 7 configuration tabs with full customization
- **Bulk Operations**: Synchronization across multiple clients

**Real MCP Implementation Details:**
- `MCPClient.ts`: Spawns actual server processes using child_process
- `ConnectionMonitor.ts`: Live ping/health checks with automatic reconnection
- `MetricsService.ts`: Real tool counts, response times, and connection status
- `ServerCatalogService.ts`: Actual MCP ecosystem servers (not mock data)
- Full IPC integration for secure main/renderer communication

**Recent Bug Fixes:**
- Task 92: Fixed server drag-and-drop functionality in Visual Workspace
- Task 93: Fixed client selection - all clients now selectable
- TypeScript compilation: Fixed test file exclusions in tsconfig.main.json

**Backlog Items:**
- Client configuration path settings UI with gear icon
- Task 102: Reimplement client card drag-and-drop (removed to fix selection)

**Kiro Specifications**: Reference `.kiro/specs/mcp-config-manager/` for detailed requirements, design, and task tracking.

## Engineering Approach

Following Kiro steering guidelines:
- **No Shortcuts**: Fix existing code before creating new logic
- **Commit Frequently**: Regular commits with meaningful messages  
- **Project Context**: Use specs, requirements, and designs to guide development
- **Task Tracking**: Update `.kiro/specs/mcp-config-manager/tasks.md` as tasks complete
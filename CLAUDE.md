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

**Completed (✓):**
- Project structure and development environment
- Core TypeScript interfaces and data models
- File system utilities and macOS path resolution
- Configuration parsing and validation engine

**In Progress:**
- MCP client discovery system (task 5)
- Configuration scope management (task 6)
- Core configuration manager functionality (task 7)

**Key remaining tasks:**
- File monitoring and change detection (task 8)
- Backup and recovery system (task 9)
- Server configuration and testing (task 10)
- React UI components and main layout (tasks 11-12)
- Configuration editor with form/JSON modes (task 13)

See `.kiro/specs/mcp-config-manager/tasks.md` for complete implementation plan with 25 detailed tasks.
# MCP Configuration Manager

A unified desktop application for managing Model Context Protocol (MCP) server configurations across multiple AI client applications.

## Features

- **Unified Management**: Single interface for all MCP client configurations
- **Error Reduction**: Form-based editing with validation to prevent JSON syntax errors
- **Scope Management**: Support for global, user, local, and project-level configurations
- **Cross-Client Sync**: Bulk operations and synchronization across multiple AI clients
- **Real-time Monitoring**: Automatic detection of external configuration changes
- **Backup & Recovery**: Automatic backups with easy restoration

## Supported Clients

- Claude Desktop
- Claude Code
- Codex
- VS Code
- Gemini Desktop
- Gemini CLI

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run electron:dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run electron:pack` - Package app for current platform
- `npm run electron:dist` - Create distributable packages
- `npm test` - Run unit tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Project Structure

```
src/
├── main/          # Electron main process
├── renderer/      # React renderer process
└── shared/        # Shared types and utilities
```

## License

MIT
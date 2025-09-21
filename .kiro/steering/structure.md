# Project Structure & Organization

## Root Directory Structure
```
mcp-config-manager/
├── src/                    # Source code
│   ├── main/              # Electron main process
│   ├── renderer/          # React renderer process
│   ├── shared/            # Shared types and utilities
│   └── types/             # TypeScript type definitions
├── public/                # Static assets
├── dist/                  # Build output
├── tests/                 # Test files
├── docs/                  # User documentation & guides
└── .kiro/                 # Project planning & specifications
    ├── specs/             # ALL planning documents
    │   └── mcp-config-manager/
    │       ├── README.md  # Documentation index
    │       ├── project-status-summary.md  # Overall status
    │       ├── tasks.md   # Master task list
    │       ├── architecture/  # Technical design
    │       └── sprints/   # Sprint plans & reports
    └── steering/          # AI assistant guidance
```

## Source Code Organization

### Main Process (`src/main/`)
- **main.ts**: Electron main process entry point
- **ipc/**: IPC handlers for renderer communication
- **services/**: File system operations, configuration management
- **utils/**: Platform-specific utilities and helpers

### Renderer Process (`src/renderer/`)
- **components/**: Reusable React components
  - **common/**: Generic UI components
  - **client/**: Client-specific components
  - **server/**: Server management components
- **pages/**: Main application screens/views
- **hooks/**: Custom React hooks
- **store/**: Zustand state management
- **utils/**: Frontend utilities and helpers

### Shared Code (`src/shared/`)
- **types/**: TypeScript interfaces and types
- **constants/**: Application constants
- **validators/**: Configuration validation schemas
- **models/**: Data models and business logic

## Key File Patterns

### Component Structure
```typescript
// Component files follow this pattern:
ComponentName/
├── index.ts              # Export barrel
├── ComponentName.tsx     # Main component
├── ComponentName.test.tsx # Tests
├── ComponentName.styles.ts # Styled components
└── types.ts              # Component-specific types
```

### Service Layer
```typescript
// Services handle business logic:
services/
├── ConfigurationManager.ts  # Core config operations
├── ClientDetector.ts        # MCP client discovery
├── ScopeManager.ts          # Configuration scope handling
├── BackupManager.ts         # Backup/restore functionality
└── FileMonitor.ts           # File system monitoring
```

## Configuration Scope Locations
- **Global**: `/etc/mcp/config.json` (system-wide)
- **User**: `~/.config/mcp/config.json` (user-specific)
- **Local**: `./.mcp/config.json` (directory-specific)
- **Project**: `./project.mcp.json` (project-specific)

## MCP Client Configuration Paths
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Code**: `~/.claude/claude_code_config.json`
- **Codex**: `~/.codex/config.json` or `~/Library/Application Support/Codex/config.json`
- **VS Code**: Workspace/user settings
- **Gemini Desktop**: `~/Library/Application Support/Gemini/config.json`
- **Gemini CLI**: `~/.gemini/config.json`

## 📚 Documentation Practices

### Planning Documents Location
**ALL project planning documents MUST be in `.kiro/specs/mcp-config-manager/`**

- Sprint plans → `.kiro/specs/mcp-config-manager/sprints/`
- Architecture docs → `.kiro/specs/mcp-config-manager/architecture/`
- Status reports → `.kiro/specs/mcp-config-manager/project-status-summary.md`
- Task tracking → `.kiro/specs/mcp-config-manager/tasks.md`

### Documentation Updates
- Update `project-status-summary.md` weekly
- Create sprint reports in `sprints/` after each sprint
- Mark completed tasks with `[x]` in `tasks.md`
- Update `README.md` index when adding new documents

### User Documentation
User-facing documentation goes in `/docs`:
- Installation guides
- User manuals
- API documentation
- Release notes

### Team Communication
For project planning and team coordination:
1. Check `.kiro/specs/mcp-config-manager/README.md` for document index
2. Review `project-status-summary.md` for current status
3. See `tasks.md` for task assignments and progress
4. Read sprint reports in `sprints/` for completed work

## Naming Conventions
- **Files**: PascalCase for components, camelCase for utilities
- **Directories**: kebab-case for feature directories, PascalCase for components
- **Types**: PascalCase with descriptive suffixes (e.g., `MCPServerConfig`, `ValidationResult`)
- **Constants**: SCREAMING_SNAKE_CASE
- **Functions**: camelCase with verb prefixes (e.g., `loadConfiguration`, `validateServer`)

## Import Organization
```typescript
// Import order:
1. React and external libraries
2. Internal components and hooks
3. Services and utilities
4. Types and constants
5. Relative imports
```
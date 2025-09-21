# Technology Stack & Build System

## Core Technologies
- **Desktop Framework**: Electron 28+ for cross-platform desktop application
- **Frontend**: React 18 with TypeScript for type-safe UI development
- **State Management**: Zustand for lightweight, performant state management
- **UI Components**: Ant Design for consistent macOS-native feel and components
- **Code Editor**: Monaco Editor for JSON editing with syntax highlighting

## Development Stack
- **Runtime**: Node.js for file system operations and backend logic
- **Language**: TypeScript throughout for type safety and better developer experience
- **Configuration Parsing**: JSON5 for flexible JSON parsing with comments support
- **File Operations**: fs-extra for robust cross-platform file system operations
- **File Monitoring**: chokidar for cross-platform file system watching
- **Testing**: Jest + React Testing Library + Electron testing utilities

## Architecture Patterns
- **Modular Design**: Clear separation between UI layer, business logic, and file system operations
- **IPC Communication**: Secure communication between Electron main and renderer processes
- **Component-Based UI**: Reusable React components with TypeScript interfaces
- **Error Boundaries**: Comprehensive error handling with user-friendly messages

## Build & Development Commands

### Setup
```bash
npm install                 # Install dependencies
npm run electron:dev       # Start development server with hot reload
```

### Building
```bash
npm run build              # Build React app for production
npm run electron:pack      # Package Electron app for current platform
npm run electron:dist      # Create distributable packages (DMG for macOS)
```

### Testing
```bash
npm test                   # Run Jest unit tests
npm run test:watch         # Run tests in watch mode
npm run test:e2e          # Run end-to-end Electron tests
```

### Code Quality
```bash
npm run lint              # Run ESLint
npm run lint:fix          # Fix auto-fixable linting issues
npm run format            # Format code with Prettier
npm run type-check        # Run TypeScript compiler checks
```

## 📚 Technical Documentation

### Planning & Architecture
All technical planning documents are in `.kiro/specs/mcp-config-manager/`:

- **Architecture Design**: `.kiro/specs/mcp-config-manager/architecture/architecture-redesign.md`
- **Refactoring Roadmap**: `.kiro/specs/mcp-config-manager/architecture/refactoring-roadmap.md`
- **Sprint Reports**: `.kiro/specs/mcp-config-manager/sprints/`
- **Task Tracking**: `.kiro/specs/mcp-config-manager/tasks.md`

### Implementation Status
- **Sprint 0**: ✅ 100% Real data implementation (eliminated all mock data)
- **Sprint 1**: ✅ Performance enhancements (50-85% improvements)
  - Caching: 72% hit rate
  - Retry logic: 95% success rate
  - IPC batching: 5-10x faster
- **Sprint 2**: 🔄 Type system migration (current)

### Key Achievements
- 100% real data - no mock/hardcoded values
- 8 real MCP clients detected
- 16+ real servers in catalog
- 50% technical debt reduced (target: 70%)

## Platform-Specific Considerations
- **macOS**: Native UI elements, FSEvents for file monitoring, code signing and notarization
- **File Paths**: macOS-specific path resolution for MCP client configurations
- **Security**: Electron sandbox mode where possible, secure IPC communication
- **Performance**: Lazy loading, configuration caching, debounced file operations

## Development Problem-Solving Guidelines
- **Repeated Regressions**: When facing persistent bugs or regressions, seek additional perspective from Gemini or Codex CLIs
- **Complex Challenges**: For architectural decisions or complex technical challenges that resist solution, consult alternative AI assistants
- **Cross-Validation**: Use multiple AI perspectives to validate critical implementation decisions
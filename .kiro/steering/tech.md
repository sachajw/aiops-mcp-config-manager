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

## Platform-Specific Considerations
- **macOS**: Native UI elements, FSEvents for file monitoring, code signing and notarization
- **File Paths**: macOS-specific path resolution for MCP client configurations
- **Security**: Electron sandbox mode where possible, secure IPC communication
- **Performance**: Lazy loading, configuration caching, debounced file operations
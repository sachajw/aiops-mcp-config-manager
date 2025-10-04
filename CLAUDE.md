# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavioral Guidelines
- Mistakes are not desired. Do your best to not make mistakes. When you do not know what to do say it.
- Do not use "You're absolutely right" in responses
- When experiencing repeated regressions or challenges, consult with Gemini or Codex CLIs for additional perspective

## 🤖 Context Self-Management Instructions

### AUTOMATIC CONTEXT UPDATES (Claude Code should follow these):

1. **At Session Start:**
   - ALWAYS load steering files first: `.kiro/steering/` (product.md, structure.md, tech.md)
   - Check if current sprint tasks in this file match `.kiro/specs/mcp-config-manager/tasks.md`
   - If outdated, update the "Current Sprint Tasks" section below
   - Remove any completed tasks (marked ✅ in tasks.md)
   - Load appropriate context based on user's stated work area:
     - "visual workspace" → Focus on `src/renderer/components/VisualWorkspace/`
     - "backend/services" → Focus on `src/main/services/`
     - "IPC" → Load `/docs/api/ipc-contracts.md`
     - "testing" → Load test files and jest configs
   - Note the starting context topic for monitoring switches

2. **During Work:**
   - When completing a task, immediately update this file's "Current Sprint Tasks"
   - When finding a bug, add to "Active Bugs" section
   - When a bug is fixed, remove from "Active Bugs"
   - Track context switches (frontend→backend, bug→feature, etc.)
   - Monitor message count and suggest `/clear` at thresholds

3. **Context Loading Rules:**
   - NEVER load entire `.kiro/specs/` directory (too many tokens)
   - Use targeted loading based on work type
   - Reference files with paths instead of loading full content
   - Use Grep/Glob for searching instead of preloading everything
   - Keep track of loaded context size

4. **Context Health Monitoring:**
   - Message count in current conversation
   - Number of different topics discussed
   - Size of loaded context files
   - Relevance of current context to active work

### Current Sprint Tasks (Auto-update 2025-01-31):
**Current Focus: Sprint 5 - Visual Workspace Completion**

**✅ Sprint 4 Completed:**
- [x] Task 178: Bug-021 Infinite retry loops fixed - QA VERIFIED
- [x] Task 180: Bug-027 OAuth/Fireflies loop fixed - COMPLETED
- [x] Task 22: Electron packaging/DMG distribution - DONE

**🔴 Sprint 5 CRITICAL Tasks (Visual Workspace):**
- [ ] Task 177: Bug-020 - Performance issue (30s freeze) - Has solution
- [ ] Task 170: Bug-016 - JSON Editor hides visual canvas
- [ ] Task 175: Bug-019 - Project scope doesn't load configs
- [ ] Task 172: Bug-018 - Project scope save inaccessible
- [ ] Task 171: Bug-017 - Discovery installation broken

**📋 Sprint 5 Status:**
- 5 critical Visual Workspace bugs to fix
- Target completion: February 7, 2025
- Focus: Save/load MUST work in all scopes
- Performance target: <2 seconds all operations

### Active Bugs (Updated 2025-01-31):
- **Bug-016-020**: Visual Workspace critical bugs - SPRINT 5 FOCUS
- **Bug-022**: Claude Desktop auto-launch (investigation needed)
- **Bug-007-013**: UI polish issues (lower priority)

### Context Files by Work Type:
- **Visual Workspace**: Load `.kiro/CONTEXT-VISUAL-WORKSPACE.md`
- **Backend Services**: Load `.kiro/CONTEXT-BACKEND-SERVICES.md`
- **IPC Work**: Load `.kiro/CONTEXT-IPC.md`
- **Store Work**: Load `src/renderer/store/simplifiedStore.ts`
- **QA Instance**: Load `CLAUDE-QA.md` (for QA/documentation specialist role)

### Always Include (Core References):

**STEERING FILES** (Behavior & Standards - Always Load):
- **Product Guidance**: `.kiro/steering/product.md` - Project purpose and focus
- **Structure Standards**: `.kiro/steering/structure.md` - File organization and patterns
- **Tech Stack Rules**: `.kiro/steering/tech.md` - Technology decisions and build commands

**SPECS FILES** (Plans & Status - Load on Demand):
- **Current Sprint**: `.kiro/specs/mcp-config-manager/sprints/sprint-2-architecture-refactor.md`
- **Active Tasks**: `.kiro/specs/mcp-config-manager/tasks.md` (check for latest status)
- **Architecture**: `.kiro/specs/mcp-config-manager/architecture/` (when refactoring)

### How to Switch Context (Claude Code Instructions):
1. When user mentions "visual workspace", "server library", "drag drop":
   - Read `.kiro/CONTEXT-VISUAL-WORKSPACE.md` for specific issues
   - Focus on those specific files and line numbers

2. When user mentions "services", "refactor", "instance-based":
   - Read `.kiro/CONTEXT-BACKEND-SERVICES.md` for patterns
   - Load only the specific service being refactored

3. When user mentions "IPC", "handler", "invoke":
   - Read `.kiro/CONTEXT-IPC.md` for common issues
   - Check handler names match between main and renderer

4. ALWAYS purge completed tasks from this file when marking them done in tasks.md

### 🧹 Context Clear Notifications (IMPORTANT):
Claude Code should proactively suggest `/clear` when:
- Switching between major work areas (frontend → backend)
- After completing a story or major task group
- When context exceeds 50 messages
- When switching sprints or major features
- Before starting unrelated work

Example notification:
"✨ Context switch detected: Moving from Visual Workspace to Backend Services.
You can use `/clear` to start fresh with the new context loaded."

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

**Project Planning & Documentation**:
- ALL planning documents are in `.kiro/specs/mcp-config-manager/`
- See `.kiro/specs/mcp-config-manager/README.md` for complete documentation index
- Current status: `.kiro/specs/mcp-config-manager/project-status-summary.md` (65% complete)
- Task tracking: `.kiro/specs/mcp-config-manager/tasks.md`
- Sprint plans: `.kiro/specs/mcp-config-manager/sprints/`
- Current Sprint: Sprint 2 - Architecture Refactor (Week 1)

## Engineering Approach

Following Kiro steering guidelines:
- **No Shortcuts**: Fix existing code before creating new logic
- **Commit Frequently**: Regular commits with meaningful messages
- **Project Context**: Use specs, requirements, and designs to guide development
- **Task Tracking**: Update `.kiro/specs/mcp-config-manager/tasks.md` as tasks complete
- do not create or use mock data or hardcoded data to be displayed in the frontend
- use a TDD approach
- Do not value complexity. value simplicity.

### ⚠️ CRITICAL: No Fallback Anti-Pattern

**BANNED PATTERNS** (These mask failures and create false success):
```javascript
// ❌ NEVER USE:
value || 0           // Shows 0 when undefined (false success)
value || false       // Shows false when undefined (misleading)
value || ""          // Shows empty string when undefined (hides errors)
value || []          // Shows empty array when undefined (fake data)
```

**REQUIRED PATTERNS**:
```javascript
// ✅ ALWAYS USE:
value ?? '—'                                    // Nullish coalescing for display
typeof value === 'number' ? value : '—'        // Explicit type checking
value === true / value === false               // Explicit boolean checking
```

**WHY**: The `||` operator treats 0, false, and "" as falsy, causing real values to be replaced with fallbacks. This makes debugging impossible and creates false impressions of success. If the backend returns 0, we want to show 0. If it returns undefined/null (failure), we want to show "—" to indicate no data.

## Documentation & Testing Strategy

### Development Workflow Requirements

#### For Every Code Change:
1. **IPC Endpoints**: Update `/docs/api/ipc-contracts.md` IMMEDIATELY when adding/modifying handlers
2. **Service Contracts**: Update `/docs/api/service-contracts.md` when changing service interfaces
3. **Tests**: Write/update tests in the SAME commit as code changes
4. **Validation**: Run `npm run type-check && npm test` before marking any task complete

#### Documentation Commands:
```bash
npm run docs:generate  # Generate TypeDoc documentation
npm run docs:validate  # Check documentation coverage
npm run docs:ipc      # Generate IPC contracts from code
```

#### Task Completion Checklist:
- [ ] Code implementation complete
- [ ] Tests written and passing
- [ ] Documentation updated (if API changed)
- [ ] Type checking passes (0 errors)
- [ ] tasks.md updated with completion status

### Testing Requirements by Change Type

| Change Type | Testing Required | Documentation Required |
|------------|------------------|----------------------|
| New IPC endpoint | Unit test + integration test | Update ipc-contracts.md |
| Service method | Unit test with mocks | Update service-contracts.md |
| UI component | Component test + snapshot | JSDoc comments |
| Bug fix | Regression test | Changelog entry |
| Refactoring | Existing tests must pass | Update if API changed |

### Parallel QA Instance (For Major Features)

When working on features > 2 hours, consider running a parallel QA instance:
```
Developer Instance: Focus on implementation
QA Instance: Write tests, update docs, validate coverage
```

### Documentation Priority Levels

- **P0 (Immediate)**: API changes that break other code
- **P1 (Same PR)**: New features users interact with
- **P2 (Within Sprint)**: Bug fixes and improvements
- **P3 (Eventually)**: Internal refactoring notes

## Task Management Workflow (CRITICAL)

ALL work must be tracked using the Kiro specification files in `.kiro/specs/mcp-config-manager/`:

### Task Hierarchy and Updates
1. **Tasks** → tracked in `tasks.md`
   - When a task completes, mark it ✅ in tasks.md
   - Create new tasks for bugs/issues discovered

2. **Stories** → collection of related tasks
   - When all tasks in a story complete, update the story status
   - Stories are tracked in sprint files (e.g., `sprints/sprint-2-type-migration-plan.md`)

3. **Sprints** → collection of stories
   - When all stories in a sprint complete, mark sprint as complete
   - Update sprint status in both `tasks.md` and sprint-specific files

4. **Requirements** → fulfilled by sprints
   - When sprints complete requirements, update `requirements.md`
   - Track requirement completion percentage

### File Organization
- **Primary tracking**: `.kiro/specs/mcp-config-manager/tasks.md` - Ultimate source of truth
- **Sprint details**: `.kiro/specs/mcp-config-manager/sprints/sprint-*.md`
- **Requirements**: `.kiro/specs/mcp-config-manager/requirements.md`
- **Architecture**: `.kiro/specs/mcp-config-manager/architecture/`
- **Backlog**: `.kiro/specs/mcp-config-manager/backlog-consolidated.md`

### Update Rules
- NEVER create documentation in `/docs/` for task tracking
- ALWAYS update tasks.md when ANY work is done
- Keep accurate percentages and statuses
- When bugs are found, create tasks immediately
- When tasks complete, close related issues/bugs

### Work Unit Approach
- **Work in STORY units**: Complete ALL tasks in a story before stopping
- **Sprint completion goal**: When possible, complete entire sprint in one cycle
- **Validation required**: Test and validate work continuously
- **Completion reporting**: Report back when story/sprint reaches 100%
- **No partial work**: Don't leave stories half-done between sessions

## API Documentation Requirements

**CRITICAL: Maintain API Documentation**

### IPC Contract Documentation

#### Frontend Development
- **ALWAYS** reference `/docs/api/ipc-contracts.md` before making IPC calls
- Check the exact endpoint name, parameters, and return types
- Use the type-safe `invokeIPC` helper function when available
- If an endpoint doesn't exist in the documentation, it needs to be added to the backend first
- Common mistake: Using wrong endpoint names (e.g., `metrics:getServer` instead of `metrics:getServerMetrics`)

#### Backend Development
- **IMMEDIATELY** update `/docs/api/ipc-contracts.md` when:
  - Adding new IPC handlers
  - Modifying handler parameters or return types
  - Removing or renaming handlers
  - Changing error responses
- Documentation updates must be in the same commit as handler changes
- Include usage examples for complex endpoints
- Run `npm run docs:ipc` to regenerate TypeScript contracts after changes

### Service Contract Documentation

#### All Developers
- **ALWAYS** reference `/docs/api/service-contracts.md` before using services
- Check the interface contracts and method signatures
- Use dependency injection via the container: `container.get<ServiceType>('serviceName')`
- Never import service singletons directly

#### Service Development
- **IMMEDIATELY** update `/docs/api/service-contracts.md` when:
  - Adding new service interfaces
  - Modifying method signatures
  - Adding new data types
  - Changing service registration
- Keep interfaces in `container.ts` synchronized with documentation
- Follow SOLID principles - program to interfaces, not implementations

### IPC Contract Documentation Structure
The documentation at `/docs/api/ipc-contracts.md` contains:
- All endpoint names with their handler prefix
- Parameter types and descriptions
- Return types and formats
- Error scenarios and handling
- TypeScript contract definitions
- Usage examples

### Common IPC Prefixes
- No prefix: System operations (app settings, backups, utils)
- `clients:` - Client discovery and management
- `config:` - Configuration CRUD operations
- `server:` - Server testing and validation
- `metrics:` - Metrics and monitoring
- `catalog:` - Server catalog operations
- `connection:` - Connection monitoring
- `mcp:` - MCP server inspection

### Example IPC Call Pattern
```typescript
// Frontend: Always check documentation first
// From /docs/api/ipc-contracts.md:
// 'config:load': params: [string, ConfigScope?], returns: Configuration | null

const config = await window.electron.invoke('config:load', 'claude-desktop', 'user');
```

### Preventing IPC Mismatches
- Frontend developers: Never guess endpoint names or parameters
- Backend developers: Never rename endpoints without updating all references
- Use TypeScript strict mode to catch type mismatches
- Test IPC calls with actual data, not assumptions
- you are QA. You shoudl to fix the code, I did not ask you to fix the code. when you do you conflict iwht the deeloepr and make things harder

## PM Workflow: Managing Plans, Specs, and Releases

### Recently Updated Planning Files (as of 2025-09-30)
**Most Recent Updates:**
- `tasks.md` - Primary task tracking (updated 2025-09-29 15:45)
- `project-status-summary.md` - Overall project status (updated 2025-09-29 11:47)
- `context-audit-report.md` - Context management audit (updated 2025-09-29 11:47)
- `backlog-consolidated.md` - Backlog items (updated 2025-09-29 11:47)
- `requirements.md` - Project requirements (updated 2025-09-29 11:47)

**Sprint Files (by recency):**
1. `sprint-4-critical-fixes.md` - Current sprint
2. `sprint-3-week-2-completion.md` - Previous completion
3. `sprint-3-server-lifecycle-testing.md` - Testing work
4. `sprint-plan.md` & `sprint-plan-revised.md` - Planning docs

### PM Role-Specific Instructions

#### When Acting as PM:
1. **Review Planning Files**: Use `ls -lt` to check timestamps and identify stale documents
2. **Update Sprint Plans**: Keep sprint files synchronized with actual work
3. **Track Progress**: Monitor task completion in `tasks.md` against sprint goals
4. **Coordinate Roles**: Create clear prompts for Developer and QA instances
5. **Document Decisions**: Update architecture, requirements, and design docs

#### Sprint Planning Workflow:
```bash
# Check recently modified planning files
ls -lt .kiro/specs/mcp-config-manager/sprints/*.md | head -5

# Review current sprint status
# Read: .kiro/specs/mcp-config-manager/sprints/sprint-4-critical-fixes.md

# Check task completion
# Grep: ✅|COMPLETED in tasks.md

# Update sprint progress
# Edit sprint file with current status
```

#### Creating New Sprints:
1. Review completed work in previous sprint
2. Identify next priorities from requirements.md and backlog
3. Create new sprint file: `sprint-X-theme-name.md`
4. Define clear success criteria and deliverables
5. Break work into developer and QA tasks
6. Set realistic timelines based on team velocity

### Developer & QA Prompt Templates

#### Developer Prompt Template:
```
Role: Developer Instance
Sprint: [Sprint Name]
Focus: [Primary deliverable]

Tasks:
1. [Task ID]: [Task description with file references]
2. [Task ID]: [Task description with acceptance criteria]

Guidelines:
- Follow TDD approach
- Update IPC contracts immediately
- Run type-check before marking complete
- Commit frequently with meaningful messages
- Update tasks.md when task completes

Files to Review:
- [List specific implementation files]
- [Architecture/design docs if needed]
```

#### QA Prompt Template:
```
Role: QA Instance
Sprint: [Sprint Name]
Focus: [Testing scope]

Test Plan:
1. [Feature/Bug]: [Test scenarios]
2. [Integration]: [End-to-end flows]
3. [Regression]: [Areas to verify]

Guidelines:
- Write tests before or during development
- Validate all IPC endpoints work
- Check error handling and edge cases
- Update test documentation
- Run full test suite before sign-off

Success Criteria:
- [ ] All tests passing
- [ ] Coverage > 80%
- [ ] No regressions
- [ ] Documentation updated
```

## Apple Code Signing & Distribution Workflow

### Current Configuration Status
**Package.json Build Config:**
- **appId**: `com.mcptools.config-manager`
- **Product Name**: `MCP Configuration Manager`
- **Mac Targets**: DMG for arm64 and x64
- **Hardened Runtime**: Currently DISABLED (needs fixing)
- **Gatekeeper**: Currently bypassed (not production-ready)

### Issues to Address (Sprint 5 Release Preparation):

#### 🔴 Critical: Enable Hardened Runtime
**Current State**: `"hardenedRuntime": false`
**Required**: `"hardenedRuntime": true` for App Store and proper code signing
**Entitlements**: `build/entitlements.mac.plist` exists but may need updates

#### 🔴 Critical: Apple Developer Certificate
**Status**: Likely missing proper signing certificate
**Required Steps**:
1. Obtain Apple Developer account ($99/year)
2. Create Developer ID Application certificate
3. Download and install certificate in Keychain
4. Configure electron-builder with certificate identity

#### 🟡 Important: Notarization
**Status**: Not configured
**Required**: All Mac apps outside App Store must be notarized by Apple
**Process**:
1. Build and sign app with hardened runtime
2. Upload to Apple for notarization
3. Staple notarization ticket to app
4. Distribute to users

### Developer Prompt for Code Signing Setup:
```
Role: Developer Instance - Release Engineering
Task: Configure Apple Code Signing & Notarization

Objective: Make MCP Configuration Manager installable on macOS without Gatekeeper warnings

Environment:
- Xcode and command-line developer tools are installed
- Can use: codesign, security, spctl, stapler commands
- Can validate configurations even without signing certificate

Steps:
1. **Review Current Configuration**:
   - Check package.json build.mac settings
   - Verify entitlements.mac.plist exists and is correct
   - Review electron-builder documentation for macOS signing

2. **Update Entitlements** (build/entitlements.mac.plist):
   Required entitlements for our app:
   - com.apple.security.cs.allow-unsigned-executable-memory (for Node.js)
   - com.apple.security.cs.disable-library-validation (if using native modules)
   - com.apple.security.network.client (for MCP server connections)
   - com.apple.security.files.user-selected.read-write (for config files)
   - com.apple.security.cs.allow-jit (for V8 engine)

3. **Enable Hardened Runtime**:
   - Change "hardenedRuntime": false → true in package.json
   - Add "notarize": true configuration
   - Configure CSC_LINK and CSC_KEY_PASSWORD environment variables

4. **Validate Entitlements Syntax**:
   - Use plutil to validate XML: plutil -lint build/entitlements.mac.plist
   - Ensure proper plist format
   - Check for typos in entitlement keys

5. **Document Certificate Setup**:
   - Create docs/RELEASE.md with step-by-step signing instructions
   - Document how to obtain Developer ID certificate
   - Explain keychain setup and certificate export
   - Include commands to check for certificates: security find-identity -v -p codesigning

6. **Test Build Configuration**:
   - Build with: npm run electron:dist
   - Verify signature: codesign -dv --verbose=4 "release/MCP Configuration Manager.app"
   - Check entitlements: codesign -d --entitlements - "release/MCP Configuration Manager.app"
   - Test with: spctl -a -vv "release/MCP Configuration Manager.app"

Files to Create/Update:
- package.json (build.mac section)
- build/entitlements.mac.plist
- docs/RELEASE.md (new file)
- .github/workflows/release.yml (if using CI/CD)

Success Criteria:
- [ ] Hardened runtime enabled
- [ ] Proper entitlements configured
- [ ] Entitlements file validates with plutil
- [ ] App signs successfully with test certificate
- [ ] Documentation complete for release process
- [ ] No Gatekeeper warnings on test machine
```

### QA Prompt for Release Validation:
```
Role: QA Instance - Release Testing
Task: Validate Code Signed Application

Objective: Verify signed app works correctly and installs without warnings

Environment:
- Xcode and command-line developer tools are installed
- Available tools: codesign, security, spctl, stapler, plutil
- Can validate configurations and test unsigned builds

Test Plan:

1. **Pre-Signing Configuration Validation**:
   ```bash
   # Validate entitlements plist syntax
   plutil -lint build/entitlements.mac.plist

   # Check for available signing identities (if any)
   security find-identity -v -p codesigning

   # Verify package.json syntax
   cat package.json | python3 -m json.tool > /dev/null && echo "Valid JSON"
   ```

2. **Signature Verification** (after signing):
   ```bash
   # Verify app is properly signed
   codesign -dv --verbose=4 "release/MCP Configuration Manager.app"

   # Check for hardened runtime
   codesign -d --verbose "release/MCP Configuration Manager.app" | grep runtime

   # Verify entitlements
   codesign -d --entitlements - "release/MCP Configuration Manager.app"
   ```

2. **Gatekeeper Testing**:
   - Mount DMG and drag app to Applications
   - Run: spctl -a -vv "path/to/app"
   - Expected: Should pass or show clear notarization status
   - Launch app and verify no security warnings

3. **Functional Testing After Signing**:
   - App launches successfully
   - All MCP client connections work
   - File system access (reading configs) works
   - Network access (server connections) works
   - No permission errors or crashes

4. **Fresh Install Testing**:
   - Test on clean macOS VM or different machine
   - Verify first-run experience
   - Check permission dialogs are appropriate
   - Validate app survives OS updates

5. **Notarization Testing** (if implemented):
   ```bash
   # Check notarization status
   spctl -a -v "path/to/app"

   # Verify stapled ticket
   stapler validate "path/to/app"
   ```

Success Criteria:
- [ ] App signature valid
- [ ] No Gatekeeper warnings
- [ ] All functionality works post-signing
- [ ] Fresh install succeeds on test machine
- [ ] Notarization complete (if implemented)
- [ ] Release documentation accurate

Regression Checks:
- [ ] Visual Workspace save/load still works
- [ ] Client detection unchanged
- [ ] Server connections functional
- [ ] Performance unchanged
```

### Release Checklist (PM Coordination):
- [ ] Developer: Configure code signing
- [ ] Developer: Enable hardened runtime
- [ ] Developer: Create release documentation
- [ ] QA: Validate signed build
- [ ] QA: Test on fresh macOS install
- [ ] PM: Review release notes
- [ ] PM: Coordinate GitHub release
- [ ] All: Sign off on production build

### Next Sprint (Sprint 5): Release Preparation
**Focus**: Production-ready distribution
**Deliverables**:
1. Proper Apple code signing configured
2. Hardened runtime enabled
3. Notarization process documented
4. Release automation (optional)
5. User-facing release notes

**Timeline**: 1-2 weeks depending on certificate acquisition
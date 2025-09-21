# Sprint 2: Type System Migration Plan

## Sprint Overview
**Goal**: Migrate from old type system to new unified type system with Zod validation
**Duration**: 1 week
**Status**: 🔄 In Progress (60% Complete)

## Current State Assessment

### ✅ Already Completed
1. **New Type Definitions Created**
   - `/src/shared/types/models.new.ts` - Domain models
   - `/src/shared/types/api.new.ts` - API interfaces
   - `/src/shared/types/ipc.new.ts` - IPC message types
   - `/src/shared/types/electron.ts` - Unified ElectronAPI interface (NEW)

2. **Zod Schemas Implemented**
   - `/src/shared/schemas/config.schema.ts` - Configuration validation
   - Validation engine using Zod

3. **Adapters Created**
   - `/src/shared/adapters/clientAdapter.ts`
   - `/src/shared/adapters/serverAdapter.ts`
   - `/src/shared/adapters/configurationAdapter.ts`

4. **Partial Migrations Complete** (NEW)
   - `/src/main/ipc/handlers/ConfigHandler.ts` - ValidationResult type migrated
   - `/src/renderer/store/simplifiedStore.ts` - Removed any types, fixed ElectronAPI
   - `/src/shared/types/index.ts` - Exports new types alongside old ones

### 🔄 Migration Needed

#### Current State
- **188 TypeScript errors remaining** (type-check fails)
- **51 occurrences of `any` types** in renderer components
- **Major issues**:
  - ValidationError type mismatches (missing path, details, relatedIssues)
  - MCPClient vs DetectedClient incompatibilities
  - ScopeConfigEntry cannot be used as index type
  - React Flow edge type constraints violations

#### Files Still Using Old Types
- `applicationStore.ts` - Main application state
- `useClients.ts` - Client data hook
- `useServers.ts` - Server data hook
- `FormEditor.tsx` - Form editing component
- `apiService.ts` - 18 any types
- Multiple other components

## Migration Strategy

### Phase 1: Non-Breaking Migration (Days 1-2)
1. **Keep both type systems working in parallel**
   - Old types remain for backward compatibility
   - New types available under `.new` imports
   - Adapters handle conversion between systems

2. **Update Core Services First**
   - IPC handlers
   - API service
   - Store layer

### Phase 2: Component Migration (Days 3-4)
1. **Migrate React Hooks**
   - Update `useClients.ts` to use new types
   - Update `useServers.ts` to use new types
   - Update other data hooks

2. **Migrate Components by Priority**
   - Critical: Form editors, dialogs
   - Important: Visual workspace components
   - Nice to have: Utility components

### Phase 3: Validation Integration (Day 5)
1. **Apply Zod Validation**
   - API endpoints validation
   - Form input validation
   - Configuration file validation

2. **Error Handling**
   - Type-safe error messages
   - Validation error display
   - Recovery suggestions

### Phase 4: Cleanup (Day 6)
1. **Remove Old Types**
   - Delete deprecated type files
   - Remove `.new` suffix from new files
   - Update all imports

2. **Documentation**
   - Update type documentation
   - Add migration guide
   - Update API docs

## Implementation Tasks

### Priority 1: Core Infrastructure
- [x] Update IPC handlers to use new types (ConfigHandler done)
- [ ] Migrate applicationStore to new types
- [ ] Update API service with Zod validation (18 any types remain)

### Priority 2: Data Layer
- [ ] Migrate useClients hook
- [ ] Migrate useServers hook
- [ ] Migrate useConfigurations hook
- [ ] Migrate useDiscovery hook

### Priority 3: Components
- [ ] Update FormEditor component
- [ ] Update dialog components
- [ ] Update Visual Workspace components
- [ ] Update settings components

### Priority 4: Validation
- [ ] Add Zod validation to API endpoints
- [ ] Implement form validation
- [ ] Add configuration validation
- [ ] Create validation error handlers

## Type Mapping Guide

### Old → New Type Mappings
```typescript
// Client Types
MCPClient → Client (from models.new.ts)
ClientType → ClientType (same, but from models.new.ts)
ClientStatus → ClientStatus (from models.new.ts)

// Server Types
MCPServer → Server (from models.new.ts)
ServerStatus → ServerStatus (from models.new.ts)

// Configuration Types
Configuration → Configuration (from models.new.ts)
ConfigScope → ConfigScope (from models.new.ts)
```

### Import Changes
```typescript
// Old
import { MCPClient, MCPServer } from '../../shared/types';

// New
import { Client, Server } from '../../shared/types/models.new';
// or after cleanup
import { Client, Server } from '../../shared/types/models';
```

## Success Criteria
1. ✅ All components using new type system
2. ✅ Zod validation applied to all data inputs
3. ✅ No TypeScript errors
4. ✅ All tests passing
5. ✅ Old type files removed
6. ✅ Documentation updated

## Risk Mitigation
1. **Backward Compatibility**
   - Keep adapters until migration complete
   - Test each component after migration
   - Feature flag for gradual rollout

2. **Type Conflicts**
   - Use `.new` suffix during migration
   - Clear naming conventions
   - Explicit imports

3. **Runtime Errors**
   - Comprehensive testing
   - Gradual migration
   - Rollback plan

## Tracking Progress

### Day 1-2: Infrastructure (40% Complete)
- [x] IPC handlers partially migrated (ConfigHandler updated)
- [x] Store layer partially migrated (simplifiedStore updated)
- [ ] API service updated (18 any types remain)

### Day 3-4: Components (0% Complete)
- [ ] Hooks migrated
- [ ] Critical components updated
- [ ] All components migrated

### Day 5: Validation (0% Complete)
- [ ] Zod validation integrated
- [ ] Error handling improved
- [ ] Validation tests added

### Day 6: Cleanup (0% Complete)
- [ ] Old types removed
- [ ] Documentation updated
- [ ] Migration guide created

## Notes
- Focus on maintaining application stability during migration
- Test thoroughly after each component migration
- Keep team updated on breaking changes
- Document any issues or blockers

---

*Sprint Started: 2025-09-20*
*Expected Completion: 2025-09-27*
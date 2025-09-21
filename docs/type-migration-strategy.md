# Type System Migration Strategy

## Current Status
- Application is running with original type definitions
- New comprehensive type system created in `.new.ts` files:
  - `src/shared/types/models.new.ts` - Core domain models
  - `src/shared/types/api.new.ts` - API interface definitions
  - `src/shared/types/ipc.new.ts` - IPC communication types
  - `src/shared/schemas/config.schema.ts` - Zod validation schemas

## Migration Approach

### Phase 1: Foundation (Current)
✅ Create new type definitions alongside existing ones
✅ Ensure application continues to work with original types
⬜ Set up feature flags for gradual migration

### Phase 2: Service Layer Migration
1. **Start with isolated services** (lowest impact):
   - ValidationEngine
   - ConfigurationParser
   - ClientDetector

2. **Update service interfaces** to use new types:
   - Add type adapters/converters between old and new types
   - Test each service independently

3. **Migrate IPC handlers** one by one:
   - Start with simple read operations
   - Progress to write operations
   - Finally handle complex operations (sync, bulk updates)

### Phase 3: Component Migration
1. **Create type adapters** for React components:
   ```typescript
   // adapters/typeAdapters.ts
   export function toNewMCPServer(oldServer: OldMCPServer): NewMCPServer
   export function toOldMCPServer(newServer: NewMCPServer): OldMCPServer
   ```

2. **Migrate components bottom-up**:
   - Start with leaf components (no children)
   - Progress to container components
   - Finally migrate pages and layouts

3. **Update stores** after components:
   - Migrate one store at a time
   - Ensure backward compatibility during transition

### Phase 4: Cleanup
1. Remove old type definitions
2. Remove type adapters
3. Update all imports to use new types directly
4. Remove `.new` suffix from files

## Implementation Guidelines

### For Each Migration Step:
1. **Before changing**:
   - Run type-check: `npm run type-check`
   - Run tests: `npm test`
   - Note current functionality

2. **During migration**:
   - Use type adapters at boundaries
   - Keep old and new types synchronized
   - Test incrementally

3. **After migration**:
   - Verify no regressions
   - Update tests if needed
   - Document any behavior changes

### Type Adapter Example:
```typescript
// src/shared/adapters/serverAdapter.ts
import { MCPServer as OldServer } from '../types/server';
import { MCPServer as NewServer } from '../types/models.new';

export function toNewServer(old: OldServer): NewServer {
  return {
    id: old.id,
    name: old.name,
    command: old.command,
    args: old.args || [],
    env: old.env,
    enabled: old.enabled ?? true,
    metadata: old.description ? {
      description: old.description,
      version: old.version,
      // map other fields
    } : undefined,
    // map remaining fields
  };
}

export function toOldServer(newServer: NewServer): OldServer {
  // Reverse mapping
}
```

## Success Metrics
- ✅ No runtime errors during migration
- ✅ All tests continue to pass
- ✅ Type coverage increases to 100%
- ✅ No `any` types in production code
- ✅ Reduced bundle size (remove duplicate types)
- ✅ Improved developer experience with better type safety

## Risk Mitigation
1. **Feature flags** for gradual rollout
2. **Comprehensive testing** at each step
3. **Type adapters** to maintain compatibility
4. **Rollback plan** - keep old types until migration complete
5. **Parallel development** - new features use new types

## Next Steps
1. Create feature flag system
2. Set up type adapters infrastructure
3. Begin with ValidationEngine service migration
4. Create migration tracking dashboard

## Timeline Estimate
- Phase 1: ✅ Complete
- Phase 2: 2-3 days
- Phase 3: 3-4 days
- Phase 4: 1 day
- Total: ~1 week with testing

## Notes
- Prioritize maintaining application stability
- Document any breaking changes
- Consider creating automated migration scripts for repetitive changes
- Keep team informed of progress and any blockers
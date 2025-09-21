# MCP Configuration Manager - Refactoring Quick Reference

## 🎯 Core Principles

### What We're Keeping
- ✅ **All UI components and visual design**
- ✅ **All features and functionality**
- ✅ **User workflows and interactions**
- ✅ **E2E test coverage**

### What We're Changing
- 🔄 **Backend architecture** (main process)
- 🔄 **IPC communication** (type-safe)
- 🔄 **Service layer** (dependency injection)
- 🔄 **Data access** (repository pattern)

### What We're Removing
- ❌ **Mock data and implementations**
- ❌ **Duplicate API methods**
- ❌ **Console.log statements**
- ❌ **Type `any` usage**

## 📁 New Folder Structure

```
src/
├── shared/           # NEW: Shared between main & renderer
│   ├── api/         # API type definitions
│   ├── types/       # Domain models
│   └── schemas/     # Validation schemas
│
├── main/
│   ├── ipc/         # NEW: Modular IPC handlers
│   │   ├── handlers/
│   │   └── bridge/
│   ├── services/    # REFACTORED: Clean services
│   ├── repositories/# NEW: Data access layer
│   ├── config/      # NEW: Configuration constants
│   ├── security/    # NEW: Security utilities
│   └── utils/       # ENHANCED: Logging, etc.
│
└── renderer/        # UNCHANGED: Preserve all UI
    ├── components/
    ├── pages/
    ├── hooks/
    └── stores/
```

## 🔧 Key Refactoring Patterns

### Pattern 1: Type-Safe IPC

**Before:**
```typescript
// Untyped, unsafe
ipcMain.handle('config:read', async (event, ...args) => {
  return someData; // any type
});
```

**After:**
```typescript
// Typed, validated
class ConfigHandler {
  @ValidateInput(ConfigReadSchema)
  async read(params: ConfigReadParams): Promise<ConfigReadResult> {
    return this.configService.read(params);
  }
}
```

### Pattern 2: Dependency Injection

**Before:**
```typescript
// Static, untestable
const clients = await ClientDetector.discoverClients();
```

**After:**
```typescript
// Injected, testable
constructor(private clientService: ClientDetectionService) {}

async handle() {
  const clients = await this.clientService.discover();
}
```

### Pattern 3: Repository Pattern

**Before:**
```typescript
// Mixed concerns
class ConfigurationService {
  async readFile() {
    const data = await fs.readFile(path);
    // Business logic mixed with I/O
  }
}
```

**After:**
```typescript
// Separated concerns
class ConfigurationService {
  constructor(private repo: ConfigRepository) {}

  async getConfig() {
    const data = await this.repo.read();
    // Pure business logic
  }
}
```

### Pattern 4: Proper Logging

**Before:**
```typescript
console.log('[ConfigService] Reading config...');
```

**After:**
```typescript
this.logger.debug('Reading config', { path, client });
```

## 📋 Refactoring Checklist

### For Each File You Touch:

- [ ] **Remove all `any` types** - Use specific interfaces
- [ ] **Remove console.log** - Use logger
- [ ] **Remove static methods** - Use dependency injection
- [ ] **Remove mock data** - Implement real logic
- [ ] **Extract constants** - Move to config files
- [ ] **Add error handling** - Consistent error patterns
- [ ] **Add JSDoc comments** - Document public APIs
- [ ] **Add unit tests** - Minimum 80% coverage

## 🚀 Migration Commands

### Phase 1: Setup New Architecture
```bash
# Install dependencies
npm install inversify reflect-metadata zod electron-log

# Generate type definitions
npm run generate:types

# Set up DI container
npm run setup:container
```

### Phase 2: Enable Feature Flags
```bash
# Development with new architecture
USE_NEW_ARCH=true npm run electron:dev

# Testing old vs new
npm run test:architecture:comparison
```

### Phase 3: Validate Changes
```bash
# Run type checking
npm run type-check:strict

# Run unit tests
npm run test:unit

# Check for any types
npm run lint:no-any

# Bundle size analysis
npm run analyze:bundle
```

## 📊 Progress Tracking

### Quick Metrics Check
```bash
# Count any types
grep -r "any" src/ | grep -v "// eslint" | wc -l

# Count console.log
grep -r "console.log" src/ | wc -l

# Check file sizes
find src/ -name "*.ts" -exec wc -l {} \; | sort -rn | head -20

# Test coverage
npm run test:coverage
```

### Success Indicators

| Metric | Red (Bad) | Yellow (OK) | Green (Good) |
|--------|-----------|-------------|--------------|
| File size | > 500 lines | 300-500 | < 300 lines |
| Any types | > 10 | 5-10 | < 5 |
| Test coverage | < 50% | 50-80% | > 80% |
| Complexity | > 20 | 10-20 | < 10 |

## 🎓 Team Guidelines

### Do's ✅
- **DO** preserve UI functionality exactly
- **DO** write tests for new code
- **DO** use dependency injection
- **DO** follow the new patterns
- **DO** document breaking changes

### Don'ts ❌
- **DON'T** change UI components (unless fixing bugs)
- **DON'T** use `any` type
- **DON'T** use console.log
- **DON'T** create files > 300 lines
- **DON'T** skip error handling

## 🔄 Daily Workflow

### Morning Standup Questions
1. Which files did you refactor yesterday?
2. What's your type coverage now?
3. Any blockers with the new patterns?

### Before Committing
```bash
# Type check
npm run type-check:strict

# Lint check
npm run lint:fix

# Test your changes
npm run test:unit -- --watch=false

# Verify UI unchanged
npm run test:e2e
```

### PR Checklist
- [ ] No new `any` types
- [ ] No console.log statements
- [ ] Tests for new code
- [ ] Documentation updated
- [ ] Bundle size not increased

## 📚 Resources

### Documentation
- [Architecture Design](./architecture-redesign.md)
- [Refactoring Roadmap](./refactoring-roadmap.md)
- [Original Recommendations](./review/recommendations-2025-09-19-gemini.md)

### Examples
- [Type-Safe IPC Example](../src/examples/typed-ipc.ts)
- [DI Container Setup](../src/examples/container-setup.ts)
- [Repository Pattern](../src/examples/repository.ts)

### Tools
- [TSConfig Strict Mode](../tsconfig.strict.json)
- [ESLint No-Any Rule](./.eslintrc.strict.js)
- [Jest Config](../jest.config.js)

## 🆘 Common Issues & Solutions

### Issue: "Cannot find module" after refactoring
**Solution:** Update import paths in tsconfig.json

### Issue: "Type 'any' is not assignable"
**Solution:** Define proper interface for the data

### Issue: "Service is undefined"
**Solution:** Register service in DI container

### Issue: Tests failing after refactor
**Solution:** Update mocks to match new signatures

### Issue: UI not working
**Solution:** Check IPC channel names match

## 📈 Expected Outcomes

### Week 1-2
- Type definitions complete
- IPC bridge implemented
- 30% reduction in `any` usage

### Week 3-4
- Service layer refactored
- 50% test coverage
- 40% smaller file sizes

### Week 5-6
- Security fixes complete
- Logging implemented
- Zero console.log statements

### Week 7-8
- 80% test coverage
- < 5 `any` types total
- 30% faster startup

## 🎯 Final Goal

**A maintainable, type-safe, modular codebase that:**
- Preserves 100% of current functionality
- Reduces technical debt by 70%
- Improves developer productivity by 2x
- Enables easy feature additions
- Maintains excellent user experience

---

*Remember: We're improving the engine, not repainting the car. The user shouldn't notice any difference except better performance.*
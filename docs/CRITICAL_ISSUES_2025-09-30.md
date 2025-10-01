# Critical Issues - Post-Build DMG Installation
**Date**: 2025-09-30
**Build**: v0.1.8 (DMG from release/)
**Severity**: 🔴 BLOCKER - App does not launch

---

## Issue #1: App Launch Failure - Missing Axios Dependency 🔴

**Severity**: CRITICAL BLOCKER
**Status**: ❌ Blocks all functionality

### Error Details
```
A JavaScript error occurred in the main process

Uncaught Exception:
Error: Cannot find module 'axios'
Require stack:
- /Users/briandawson/workspace/mcp-config-manager/release/mac/MCP Configuration Manager.app/Contents/Resources/app.asar/dist/main/services/McpDiscoveryService.js
- [Multiple other services requiring axios]
- /Users/briandawson/workspace/mcp-config-manager/release/mac/MCP Configuration Manager.app/Contents/Resources/app.asar/dist/main/main.js

at Module._resolveFilename (node:internal/modules/cjs/loader:1084:15)
at s._resolveFilename (node:electron/js2c/browser_init:2:138672)
at Module._load (node:internal/modules/cjs/loader:929:27)
at c._load (node:electron/js2c/asar_bundle:2:13327)
at Module.require (node:internal/modules/cjs/loader:1150:19)
at require (node:internal/modules/helpers:119:18)
...
```

### Root Cause
**axios is not included in dependencies** - it's missing from package.json

### Impact
- App cannot launch at all
- No functionality accessible
- Professional release completely broken

### Resolution Required
1. **Immediate**: Add axios to dependencies in package.json:
   ```json
   "dependencies": {
     "axios": "^1.6.0",  // Add this line
     ...
   }
   ```
2. Run: `npm install`
3. Rebuild: `npm run electron:dist`
4. Test installation from fresh DMG

### Files Affected
- McpDiscoveryService.js (primary)
- All services that use HTTP requests
- Main process initialization

---

## Issue #2: App Icon Transparency Problem 🟡

**Severity**: HIGH - Visual quality/branding issue
**Status**: ⚠️ App appears unprofessional

### Problem Description
The app icon (M with gear symbol) has an **opaque white square border** around it instead of being transparent.

### Visual Evidence
- Screenshot shows white square background around icon
- Should be transparent like macOS standard app icons
- Affects:
  - Dock appearance
  - App icon in Finder
  - Error dialog icon (shown in screenshot)

### Root Cause Analysis
**CONFIRMED**: `original-icon.png` is **RGB format** (no alpha channel), while icon-512.png is RGBA.

```bash
$ file assets/icons/original-icon.png
PNG image data, 1024 x 1024, 8-bit/color RGB, non-interlaced  ← NO ALPHA

$ file assets/icons/icon-512.png
PNG image data, 512 x 512, 8-bit/color RGBA, non-interlaced  ← HAS ALPHA
```

The smaller icons may have been generated from the RGB original, inheriting the white background.

### Resolution Required
1. **Check source icon**: Verify `assets/icons/original-icon.png` and all icon-*.png files
2. **Remove white background**: Use image editor to make background transparent
3. **Regenerate .icns**:
   ```bash
   # After fixing source PNGs:
   mkdir -p build/icons.iconset
   # Copy corrected icons with proper naming
   iconutil -c icns build/icons.iconset -o build/icon.icns
   ```
4. **Rebuild**: `npm run electron:dist`
5. **Verify**: Check icon in Finder/Dock after installation

### Files to Fix
- `assets/icons/original-icon.png` - primary source
- `assets/icons/icon-512.png` through `icon-16.png` - all sizes
- `build/icon.icns` - regenerated from corrected PNGs

---

## Issue #3: Incorrect Icon in Error Dialog 🟡

**Severity**: MEDIUM - Inconsistent branding
**Status**: ⚠️ Wrong icon displayed

### Problem Description
The error dialog (screenshot #1) shows a **different icon** than the actual app icon (screenshot #2).

### Expected Behavior
- Error dialog should show the same "M with gear" icon as the app
- Screenshot #2 shows the correct target icon

### Actual Behavior
- Error dialog shows a generic or different icon
- Inconsistent branding experience

### Possible Causes
1. Electron using fallback icon for error dialogs
2. Icon not properly embedded in app bundle
3. Multiple icon files causing confusion

### Resolution
1. **Verify icon embedding**: Check if icon.icns is properly referenced in Info.plist
2. **Check electron-builder config**: Ensure icon path is correct in package.json
3. **Test with fixed transparent icon**: May resolve when Issue #2 is fixed

---

## Developer & QA Status Summary

### Developer Status
**Configuration Work**: ✅ COMPLETE
- Hardened runtime enabled
- Entitlements configured
- Code signing configured
- Release documentation created

**Build Status**: ⚠️ BUILDS BUT BROKEN
- DMG builds successfully
- Code signing works
- **But app is unlaunchable due to missing dependency**

### QA Status
**Configuration Validation**: ✅ COMPLETE
- Test plans created
- Security audit complete
- Configuration validated
- Pre-signing tests passed

**Post-Build Testing**: 🔴 BLOCKED
- Cannot test functionality - app won't launch
- Icon issues visible during installation
- Need dependency fix before functional testing

---

## Priority Action Items

### P0 - Immediate (Blocker)
1. **Add axios to package.json dependencies**
2. **Verify all HTTP-related dependencies are included**
3. **Rebuild and test DMG installation**

### P1 - High Priority
4. **Fix icon transparency** - remove white background
5. **Regenerate .icns with transparent icons**
6. **Verify icon consistency across all UI elements**

### P2 - Before Release
7. **Full regression testing** after axios fix
8. **Verify all services load correctly**
9. **Test on clean macOS system**
10. **Validate notarization with fixed build**

---

## Testing Checklist (After Fixes)

- [ ] App launches without errors
- [ ] All services load (McpDiscoveryService, etc.)
- [ ] HTTP requests work (axios functioning)
- [ ] Icon is transparent (no white border)
- [ ] Icon consistent in all contexts:
  - [ ] Finder
  - [ ] Dock
  - [ ] Error dialogs
  - [ ] About window
- [ ] DMG mounts and installs cleanly
- [ ] No Gatekeeper warnings
- [ ] Code signature valid
- [ ] Notarization successful

---

## Notes for Next Build

### Dependencies to Verify
Check that ALL runtime dependencies are in package.json "dependencies" (not devDependencies):
- axios ❌ MISSING
- All MCP-related packages
- HTTP client libraries
- Any service dependencies

### Icon Checklist
- [ ] Source PNGs have alpha transparency
- [ ] No white backgrounds in any icon size
- [ ] .icns generated from corrected sources
- [ ] Icon path in package.json points to .icns
- [ ] Test icon appearance before full build

### Build Verification Steps
1. Install from DMG on clean system
2. Launch app - verify no module errors
3. Check icon appearance in multiple contexts
4. Verify all services initialize
5. Test core functionality
6. Only then proceed to notarization

---

**Status**: BLOCKING RELEASE - Fix axios dependency immediately

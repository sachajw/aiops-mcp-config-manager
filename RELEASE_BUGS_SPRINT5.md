# Release Bugs - Sprint 5 Critical

## Bug-028: 🔴 CRITICAL - macOS Gatekeeper "App Corrupted" Error
**Status**: 🔴 RELEASE BLOCKER - NEW
**Task**: 184 (NEW)
**Sprint**: 5 - IMMEDIATE BLOCKER

### Problem
Fresh Apple Silicon macOS systems report app is corrupted and asks user to move to trash.

### Evidence
- macOS shows "app is damaged and can't be opened"
- Affects fresh installs on Apple Silicon
- Version 0.1.8 affected

### Investigation
Package.json shows:
- `hardenedRuntime: true`
- `notarize: false` (PROBLEM)
- Identity: "Brian Dawson (2TUP433M28)"

### Files to Check
- `package.json` - build.mac configuration
- `scripts/sign-and-notarize.js` - signing script
- `scripts/staple-dmg.js` - DMG stapling
- `build/entitlements.mac.plist` - entitlements

### Required Fixes
1. Enable notarization (`notarize: true`)
2. Verify certificate validity
3. Ensure DMG properly stapled
4. Test on fresh Apple Silicon Mac

---

## Bug-029: GitHub Release Using Old Icon & Won't Install
**Status**: 🔴 RELEASE ISSUE - NEW
**Task**: 185 (NEW)
**Sprint**: 5 - RELEASE CRITICAL

### Problem
Latest GitHub release (0.1.8) has wrong icon and installation fails.

### Evidence
- Old icon appearing in DMG/installer
- Installation process fails
- Public releases broken

### Files to Check
- `build/icon.icns` - macOS icon file
- `assets/icons/` - icon source files
- `.github/workflows/` - CI/CD build scripts
- electron-builder configuration

### Required Fixes
1. Update icon.icns with new design
2. Clear build cache
3. Verify GitHub Actions uses correct assets
4. Test local build vs CI build

---

## Developer Prompt for Release Fixes

```
Role: Developer Instance - Release Engineering
Sprint: 5 - Release Blockers
Focus: Fix macOS code signing and icon issues

IMMEDIATE TASK: Bug-028 - macOS Gatekeeper Error

Files to Review:
- package.json:158-167 (notarize: false issue)
- scripts/sign-and-notarize.js
- build/entitlements.mac.plist
- build/icon.icns

Steps:
1. Enable notarization in package.json
2. Verify certificate: security find-identity -v -p codesigning
3. Test build: npm run electron:dist
4. Verify signature: codesign -dv --verbose=4 "release/*.app"
5. Check entitlements: codesign -d --entitlements - "release/*.app"

Bug-029 Icon Fix:
1. Check icon.icns is updated: file build/icon.icns
2. Verify all icon sizes present (16-1024px)
3. Clear electron-builder cache: rm -rf ~/Library/Caches/electron-builder
4. Test local build shows new icon

Success Criteria:
- [ ] Notarization enabled
- [ ] App installs without Gatekeeper warning
- [ ] New icon appears in DMG
- [ ] GitHub release works
```

---

## QA Verification Checklist

### Bug-028 Verification
```bash
# Check signature
codesign -dv --verbose=4 "release/MCP Configuration Manager.app"

# Check notarization
spctl -a -vv "release/MCP Configuration Manager.app"

# Check entitlements
codesign -d --entitlements - "release/MCP Configuration Manager.app"
```

### Bug-029 Verification
```bash
# Check icon file
file build/icon.icns
sips -g all build/icon.icns

# Verify in DMG
hdiutil attach release/*.dmg
ls -la /Volumes/*/
```

### Success Criteria
- [ ] No Gatekeeper warnings
- [ ] App launches successfully
- [ ] New icon visible in Finder
- [ ] Installation completes
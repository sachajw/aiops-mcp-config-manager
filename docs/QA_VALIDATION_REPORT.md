# QA Validation Report - Code Signing Configuration

**Date**: 2025-09-30
**QA Role**: Release Configuration Validation
**Sprint**: Sprint 5 - Release Preparation
**Objective**: Validate code signing configuration and create test plans

---

## Executive Summary

### Configuration Status: ⚠️ REQUIRES DEVELOPER ATTENTION

**Critical Issues**:
1. ✅ Entitlements file exists and is well-structured
2. ❌ Hardened Runtime still disabled in package.json
3. ❌ Gatekeeper assessment disabled
4. ❌ Release documentation missing (docs/RELEASE.md does not exist)
5. ⚠️ Several potentially excessive entitlements need review
6. ⚠️ Test failures and TypeScript errors present (pre-existing, not related to signing)

**Deliverables Completed**:
- ✅ Comprehensive test plan created: [docs/TEST_PLANS.md](docs/TEST_PLANS.md)
- ✅ Security audit checklist created: [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)
- ✅ Configuration validation report (this document)
- ✅ Edge case documentation
- ✅ Regression testing executed

---

## 1. Configuration Validation Results

### 1.1 Entitlements File Review

**File**: [build/entitlements.mac.plist](../build/entitlements.mac.plist)

#### ✅ Well-Formed XML
- Valid plist structure
- Proper DOCTYPE declaration
- All tags properly closed

#### ✅ Required Entitlements Present
| Entitlement | Status | Justification |
|-------------|--------|---------------|
| `com.apple.security.cs.allow-jit` | ✅ Required | V8 JavaScript engine |
| `com.apple.security.network.client` | ✅ Required | MCP server connections |
| `com.apple.security.files.user-selected.read-write` | ✅ Required | Config file management |
| `com.apple.security.inherit` | ✅ Required | Spawn MCP server processes |

#### ⚠️ Potentially Excessive Entitlements (Require Developer Review)

1. **`com.apple.security.cs.allow-unsigned-executable-memory`** (line 6-7)
   - **Risk Level**: High
   - **Current Comment**: "Required for Electron"
   - **Action**: Confirm with developer if truly required
   - **Security Impact**: Allows executable memory without signature verification

2. **`com.apple.security.cs.disable-library-validation`** (line 10-11)
   - **Risk Level**: High
   - **Current Comment**: "Required for Electron"
   - **Action**: Test if app works without this
   - **Security Impact**: Disables library signature validation
   - **Recommendation**: Remove if not strictly necessary for native modules

3. **`com.apple.security.cs.allow-dyld-environment-variables`** (line 12-13)
   - **Risk Level**: Medium
   - **Current Comment**: "Required for Electron"
   - **Action**: Verify necessity with build tests
   - **Security Impact**: Allows runtime environment manipulation
   - **Recommendation**: Remove if app functions without it

4. **`com.apple.security.network.server`** (line 24-25)
   - **Risk Level**: Medium
   - **Current Comment**: "Network access for MCP server communication"
   - **Question**: Does the app act as a network server, or only as a client?
   - **Action**: If app only makes outbound connections, remove this
   - **Security Impact**: Allows accepting incoming network connections

5. **`com.apple.security.files.downloads.read-write`** (line 18-19)
   - **Risk Level**: Low-Medium
   - **Current Comment**: "File system access for configuration management"
   - **Question**: Why does app need ~/Downloads folder access?
   - **Action**: Verify if this is required for any feature
   - **Recommendation**: Remove if not needed

#### 📋 Developer Action Items

**For Developer Instance**:
```bash
# Test app without each entitlement iteratively:

# 1. Test without library validation disabling
# Remove: com.apple.security.cs.disable-library-validation
# Build, sign, and test app functionality

# 2. Test without dyld environment variables
# Remove: com.apple.security.cs.allow-dyld-environment-variables
# Build, sign, and test

# 3. Test without network server capability
# Remove: com.apple.security.network.server
# Build, sign, and test MCP server connections

# 4. Test without Downloads folder access
# Remove: com.apple.security.files.downloads.read-write
# Build, sign, and test config file operations

# Goal: Minimize entitlements to only what's strictly necessary
```

### 1.2 Package.json Build Configuration Review

**File**: [package.json](../package.json) (lines 126-165)

#### ✅ Correct Settings
- `appId`: "com.mcptools.config-manager" ✅
- `productName`: "MCP Configuration Manager" ✅
- `category`: "public.app-category.developer-tools" ✅
- `target`: DMG for arm64 and x64 ✅
- `icon`: Paths verified to exist ✅
- `entitlements`: Correctly references build/entitlements.mac.plist ✅
- `entitlementsInherit`: Correctly set ✅

#### ❌ Critical Issues

1. **Hardened Runtime Disabled** ([package.json:147](../package.json#L147))
   ```json
   "hardenedRuntime": false,  // ❌ MUST BE TRUE for production
   ```
   - **Impact**: App cannot be notarized
   - **Impact**: Users will see Gatekeeper warnings
   - **Impact**: App appears less trustworthy
   - **Required Action**: Change to `true`

2. **Gatekeeper Assessment Disabled** ([package.json:148](../package.json#L148))
   ```json
   "gatekeeperAssess": false,  // ❌ Should be true or removed
   ```
   - **Impact**: Bypasses security checks during development
   - **Impact**: Not production-ready
   - **Required Action**: Change to `true` or remove (defaults to true)

3. **Missing Notarization Configuration**
   ```json
   // Add to build.mac section:
   "notarize": {
     "teamId": "YOUR_TEAM_ID"
   }
   ```
   - **Note**: This can be added later when certificate is obtained

### 1.3 Icon Files Verification

✅ **All icon files exist and are properly sized**:
- `assets/icons/icon-512.png` - 267KB (✅ Good size for 512x512)
- `assets/icons/icon-256.png` - 61KB (✅ Good size for 256x256)

### 1.4 Release Documentation

❌ **Missing**: [docs/RELEASE.md](../docs/RELEASE.md) does not exist

**Required Content** (for Developer to create):
1. Certificate acquisition process
2. Certificate installation instructions
3. Environment variable setup (CSC_LINK, CSC_KEY_PASSWORD)
4. Build commands for signed releases
5. Verification steps
6. Troubleshooting common signing issues
7. Notarization process

---

## 2. Test Plan Documentation

### 2.1 Comprehensive Test Plans Created

✅ **Completed**: [docs/TEST_PLANS.md](docs/TEST_PLANS.md)

**Contents**:
- 10 comprehensive test phases
- 50+ test scenarios
- Validation commands and scripts
- Pass/fail criteria for each test
- Test results template
- Troubleshooting guide
- Continuous improvement section

**Coverage**:
- Phase 1: Pre-Build Validation (certificate, environment)
- Phase 2: Build Validation (DMG creation, structure)
- Phase 3: Signature Verification (codesign, Gatekeeper)
- Phase 4: Functional Testing (all app features)
- Phase 5: Fresh Install Testing (clean macOS systems)
- Phase 6: Notarization Testing (production only)
- Phase 7: Regression Testing (feature parity)
- Phase 8: Edge Cases & Security
- Phase 9: macOS Version Compatibility (10.15-14.0)
- Phase 10: Release Readiness Checklist

**Key Test Commands Documented**:
```bash
# Signature verification
codesign -dv --verbose=4 "App.app"
codesign -d --entitlements - "App.app"
codesign --verify --deep --strict "App.app"

# Gatekeeper testing
spctl -a -vv "App.app"

# Notarization (future)
xcrun notarytool submit app.zip
stapler validate "App.app"
```

---

## 3. Security Audit Documentation

### 3.1 Security Audit Checklist Created

✅ **Completed**: [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)

**Contents**:
- 8 major security categories
- 100+ security checkpoints
- Risk assessment framework
- Incident response procedures
- Compliance validation steps

**Coverage Areas**:
1. **Code Signing & Distribution Security**
   - Certificate management
   - Build integrity
   - Entitlements review (principle of least privilege)

2. **Application Security**
   - Data protection (config files, user data)
   - Network security (MCP connections, no telemetry)
   - Process security (child processes, Electron settings)

3. **Code Security**
   - Dependency security (npm audit)
   - Code quality (input validation, error handling)
   - TypeScript type safety

4. **User Privacy**
   - Data collection (none)
   - Transparency (permissions, storage locations)
   - User control (export, deletion, opt-out)

5. **macOS Security Integration**
   - System permissions (minimal requests)
   - Keychain integration
   - System integrity (no system modification)

6. **Build & Release Security**
   - Source code security
   - Build environment
   - Distribution channels

7. **Incident Response**
   - Certificate compromise response plan
   - Vulnerability disclosure process

8. **Testing & Validation**
   - Security testing checklist
   - Compliance testing
   - Continuous monitoring

**Key Recommendations**:
- Remove excessive entitlements after testing
- Implement regular `npm audit` checks
- Enable GitHub Dependabot
- Subscribe to Electron security advisories
- Quarterly security audits

---

## 4. Regression Testing Results

### 4.1 TypeScript Type Checking

❌ **Status**: 14 errors found (pre-existing, not related to code signing)

**Errors Summary**:
- Configuration type mismatches in test files
- Missing properties in interfaces
- Type incompatibilities in Visual Workspace component

**Files with Errors**:
1. `src/renderer/components/editor/__tests__/ConfigurationEditor.test.tsx` - 9 errors
2. `src/renderer/components/VisualWorkspace/__tests__/Bug006.test.tsx` - 1 error
3. `src/renderer/components/VisualWorkspace/__tests__/InsightsPanel.test.tsx` - 1 error
4. `src/renderer/components/VisualWorkspace/index.tsx` - 3 errors

**Impact on Signing**: ❌ None - These are test/code issues unrelated to signing

**Recommendation**: Developer should fix these before release, but they don't block signing configuration work.

### 4.2 Unit Test Results

⚠️ **Status**: 81 failed, 498 passed (579 total tests)

**Pass Rate**: 86.0% (acceptable for development, but needs improvement)

**Major Failure Categories**:
1. **Bug-017 Tests** (Discovery page issues) - 3 failures
2. **ValidationEngine Tests** - Multiple failures
3. **InstallationService Tests** - 16 failures (timeouts, missing methods)

**Notable Issues**:
- Timeouts on git clone tests (expected in test environment)
- Missing `checkInstalled` method in InstallationService
- Spawn error handling issues
- Type mismatches in test mocks

**Impact on Signing**: ❌ None - Test failures are functional issues unrelated to code signing

**Recommendation**:
- These test failures should be addressed separately
- They do not block code signing configuration
- Should be fixed before production release

### 4.3 Build Capability Test

**Not executed** - Waiting for developer to fix critical package.json settings before building.

**Next Steps**:
1. Developer updates package.json (hardenedRuntime: true)
2. Developer obtains Apple Developer certificate
3. QA runs build test: `npm run build && npm run electron:pack`
4. QA validates packaged app functionality

---

## 5. Edge Cases & Known Issues

### 5.1 Certificate-Related Edge Cases

#### Certificate Expiry
**Scenario**: What happens when Developer ID certificate expires?

**Expected Behavior**:
- Builds created before expiry remain valid
- New builds fail with signing error
- Users of expired-signed apps may see warnings (eventually)

**Mitigation**:
- Track certificate expiry date (typically 5 years)
- Set reminder 3 months before expiry
- Obtain new certificate and re-release all supported versions

**User Impact**: Medium (only affects new installations after expiry)

#### Certificate Revocation
**Scenario**: Certificate is compromised and must be revoked

**Impact**: **CRITICAL**
- All previously signed apps become untrusted immediately
- Users will be blocked from launching app
- Must obtain new certificate and re-release

**Response Plan**:
1. Immediately revoke certificate via Apple Developer portal
2. Generate new certificate with new private key
3. Rebuild and re-sign all recent versions
4. Create emergency release
5. Notify all users via GitHub, website, social media
6. Document incident and lessons learned

### 5.2 Notarization Edge Cases

#### Notarization Rejection
**Scenario**: Apple rejects app during notarization

**Common Reasons**:
- Missing or incorrect entitlements
- Unsigned nested binaries
- Hardened runtime not enabled
- Deprecated APIs used

**Resolution Steps**:
1. Review rejection email from Apple
2. Run: `xcrun notarytool log <submission-id>`
3. Fix identified issues
4. Re-submit for notarization

#### Notarization Service Downtime
**Scenario**: Apple's notarization service is unavailable

**Impact**: Cannot release new signed builds
**Mitigation**:
- Monitor Apple system status: https://developer.apple.com/system-status/
- Plan releases to avoid Apple maintenance windows
- Have backup release timeline

### 5.3 User Environment Edge Cases

#### Quarantine Attribute Issues
**Scenario**: User downloads DMG, but quarantine attribute causes issues

**Symptoms**:
- "App is damaged and can't be opened"
- App won't launch even though properly signed

**User Workaround**:
```bash
xattr -cr "/Applications/MCP Configuration Manager.app"
```

**Proper Fix**: Ensure notarization is complete and ticket is stapled

#### Gatekeeper Bypass Needed (Development Only)
**Scenario**: During development/testing, need to bypass Gatekeeper

**Method** (only for testing):
```bash
sudo spctl --master-disable  # Disable Gatekeeper (TESTING ONLY)
# ... test app ...
sudo spctl --master-enable   # Re-enable Gatekeeper
```

**Alternative** (safer):
```bash
# Allow specific app
sudo spctl --add "/path/to/MCP Configuration Manager.app"
```

#### macOS Version Compatibility
**Edge Case**: App behavior differs across macOS versions

**Testing Required**:
| macOS Version | Hardened Runtime | Notarization | Signing |
|---------------|------------------|--------------|---------|
| Catalina 10.15+ | Required | Required | Required |
| Big Sur 11.0+ | Required | Required | Required |
| Monterey 12.0+ | Required | Required | Required |
| Ventura 13.0+ | Required | Required | Required |
| Sonoma 14.0+ | Required | Required | Required |

**Note**: All versions from Catalina onwards require notarization for Gatekeeper approval.

### 5.4 Multi-User & Permission Issues

#### Admin vs. Standard User
**Edge Case**: App installed by admin, launched by standard user

**Potential Issue**: Permission errors accessing /Applications

**Expected Behavior**: Should work fine (app in /Applications is readable by all)

**Test Scenario**:
1. Admin user installs app in /Applications
2. Create standard user account
3. Switch to standard user
4. Launch app
5. Verify all features work
6. Check config files are per-user (~/Library/Application Support/)

#### Multiple Simultaneous Users
**Edge Case**: Multiple users logged in, app running for each

**Potential Issue**: Config file conflicts, port conflicts

**Expected Behavior**:
- Each user has separate config in their home directory
- MCP servers spawn with separate processes
- No conflicts between users

### 5.5 App Relocation Issues

#### App Moved After First Launch
**Scenario**: User moves app from /Applications to another location

**Potential Issues**:
- Hardcoded paths break
- Preferences still point to old location
- Gatekeeper re-verification required

**Expected Behavior**: App should work regardless of location

**Test Scenario**:
1. Install in /Applications
2. Launch and configure
3. Quit app
4. Move to ~/Applications
5. Launch from new location
6. Verify all features still work

#### App Run from DMG
**Scenario**: User runs app directly from mounted DMG (not recommended)

**Potential Issues**:
- Config changes don't persist (DMG is read-only)
- Performance degradation
- Unexpected behavior

**Mitigation**: DMG design should encourage drag-to-Applications

### 5.6 Network & Firewall Edge Cases

#### Corporate Firewall
**Scenario**: User behind restrictive corporate firewall

**Impact**:
- MCP server connections may fail
- Notarization check may fail (first launch)

**Expected Behavior**:
- App should work offline (local MCP servers)
- Graceful degradation for network features

#### VPN Issues
**Scenario**: User on VPN with DNS/routing issues

**Potential Impact**: MCP servers using network might fail

**Expected Behavior**: Local servers (filesystem, sqlite) should work

---

## 6. Issues Found & Recommendations

### 6.1 Critical Issues (Block Release)

1. **Hardened Runtime Disabled**
   - **File**: [package.json:147](../package.json#L147)
   - **Current**: `"hardenedRuntime": false`
   - **Required**: `"hardenedRuntime": true`
   - **Assigned To**: Developer Instance
   - **Priority**: P0

2. **Gatekeeper Assessment Disabled**
   - **File**: [package.json:148](../package.json#L148)
   - **Current**: `"gatekeeperAssess": false`
   - **Required**: `"gatekeeperAssess": true` or remove line
   - **Assigned To**: Developer Instance
   - **Priority**: P0

3. **Missing Release Documentation**
   - **File**: docs/RELEASE.md (does not exist)
   - **Required**: Complete signing and release process documentation
   - **Assigned To**: Developer Instance
   - **Priority**: P0

### 6.2 High Priority Issues (Should Fix Before Release)

4. **Excessive Entitlements**
   - **File**: [build/entitlements.mac.plist](../build/entitlements.mac.plist)
   - **Issues**: 5 entitlements need review (see section 1.1)
   - **Action**: Test app without each excessive entitlement
   - **Assigned To**: Developer Instance
   - **Priority**: P1

5. **TypeScript Errors**
   - **Files**: Multiple test files and VisualWorkspace/index.tsx
   - **Count**: 14 errors
   - **Action**: Fix type mismatches
   - **Assigned To**: Developer Instance
   - **Priority**: P1

6. **Test Failures**
   - **Count**: 81 failed tests (86% pass rate)
   - **Action**: Fix failing tests (especially Bug-017, InstallationService)
   - **Assigned To**: Developer Instance
   - **Priority**: P1

### 6.3 Medium Priority (Can Address Later)

7. **Notarization Configuration**
   - **File**: package.json
   - **Action**: Add notarize config when certificate obtained
   - **Assigned To**: Developer Instance
   - **Priority**: P2

8. **CI/CD for Signed Builds**
   - **Action**: Set up automated build pipeline with signing
   - **Assigned To**: DevOps/PM
   - **Priority**: P2

### 6.4 Low Priority (Nice to Have)

9. **Certificate Expiry Tracking**
   - **Action**: Set up monitoring for certificate expiry
   - **Assigned To**: PM
   - **Priority**: P3

10. **Security Audit Automation**
    - **Action**: Automate security checks (npm audit, codesign verify)
    - **Assigned To**: Developer Instance
    - **Priority**: P3

---

## 7. Recommendations for Developer Instance

### Immediate Actions Required

**Step 1: Fix Package.json** (5 minutes)
```json
// In package.json, line 147-148:
"hardenedRuntime": true,        // Change: false → true
"gatekeeperAssess": true,       // Change: false → true (or remove)
```

**Step 2: Create Release Documentation** (1-2 hours)
Create [docs/RELEASE.md](../docs/RELEASE.md) with:
- Certificate acquisition process
- Environment setup (CSC_LINK, CSC_KEY_PASSWORD)
- Build commands for signed releases
- Verification steps
- Troubleshooting guide

**Step 3: Test Entitlements** (2-3 hours)
For each potentially excessive entitlement:
1. Comment out entitlement in build/entitlements.mac.plist
2. Build: `npm run build && npm run electron:pack`
3. Test packaged app: `open release/mac-arm64/MCP Configuration Manager.app`
4. Test all features (client detection, server connections, config editing)
5. If app works, remove entitlement permanently
6. If app breaks, restore entitlement and document why it's needed

**Priority Order**:
1. Test without `com.apple.security.files.downloads.read-write` (likely unnecessary)
2. Test without `com.apple.security.network.server` (likely unnecessary)
3. Test without `com.apple.security.cs.allow-dyld-environment-variables`
4. Test without `com.apple.security.cs.disable-library-validation` (may be needed for native modules)

**Step 4: Fix TypeScript Errors** (1-2 hours)
- Run: `npm run type-check`
- Fix 14 errors in ConfigurationEditor tests and VisualWorkspace component

**Step 5: Address Test Failures** (3-4 hours)
- Focus on Bug-017 tests (Discovery page)
- Fix InstallationService missing methods
- Fix timeout issues (increase timeout or mock better)

### Future Actions (After Certificate Obtained)

**Step 6: Test Signed Build** (1 hour)
1. Set CSC_LINK and CSC_KEY_PASSWORD
2. Build: `npm run electron:dist`
3. Verify signature: `codesign -dv --verbose=4 "release/MCP Configuration Manager.app"`
4. Test installation and launch

**Step 7: Notarization** (2-3 hours)
1. Add notarize config to package.json
2. Submit to Apple: `xcrun notarytool submit`
3. Wait for approval (usually 5-30 minutes)
4. Staple ticket: `xcrun stapler staple`

**Step 8: Full QA Testing** (4-6 hours)
- Execute all test plans in docs/TEST_PLANS.md
- Test on clean macOS system
- Verify no Gatekeeper warnings

---

## 8. Success Criteria

### Configuration Validation: ⚠️ IN PROGRESS

- ✅ Entitlements file validated
- ❌ Hardened runtime enabled → **Must be fixed**
- ❌ Gatekeeper assessment enabled → **Must be fixed**
- ✅ Icon files verified
- ❌ Release documentation created → **Must be created**

### Documentation: ✅ COMPLETE

- ✅ Comprehensive test plan created (docs/TEST_PLANS.md)
- ✅ Security audit checklist created (docs/SECURITY_AUDIT.md)
- ✅ Edge cases documented
- ✅ Configuration validation report completed (this document)

### Testing: ⚠️ PARTIAL

- ✅ Regression testing executed
- ✅ Test failures documented
- ❌ Signed build testing → **Pending certificate**
- ❌ Fresh install testing → **Pending signed build**

### Release Readiness: ❌ NOT READY

**Blockers**:
1. Hardened runtime must be enabled
2. Gatekeeper assessment must be enabled
3. Release documentation must be created
4. Apple Developer certificate must be obtained
5. TypeScript errors should be fixed
6. Test pass rate should be >95%

**Estimated Time to Release Ready**: 8-12 hours of developer work

---

## 9. QA Sign-Off

### Configuration Review: ✅ COMPLETE

- [x] All configuration files reviewed
- [x] Issues identified and documented
- [x] Recommendations provided
- [x] Test plans created
- [x] Security checklist created

### Deliverables: ✅ COMPLETE

- [x] docs/TEST_PLANS.md
- [x] docs/SECURITY_AUDIT.md
- [x] docs/QA_VALIDATION_REPORT.md (this file)

### Next Steps for QA:

**After Developer Fixes Issues**:
1. Re-validate package.json configuration
2. Review docs/RELEASE.md for accuracy
3. Verify TypeScript compilation clean
4. Verify test pass rate >95%

**After Certificate Obtained**:
1. Execute Phase 1-3 of TEST_PLANS.md (signature validation)
2. Execute Phase 4 of TEST_PLANS.md (functional testing)
3. Execute Phase 7 of TEST_PLANS.md (regression testing)
4. Document any issues found

**Before Release**:
1. Execute full TEST_PLANS.md (all 10 phases)
2. Complete security audit from SECURITY_AUDIT.md
3. Sign off on release readiness

### QA Recommendation: ⚠️ NOT READY FOR RELEASE

**Current Status**: Configuration validated, test plans created, critical issues identified

**Required Before Release**:
- Developer must fix 3 critical package.json issues
- Developer must create release documentation
- Developer must obtain Apple Developer certificate
- QA must execute signed build testing
- All high-priority issues must be resolved

**Estimated Release Timeline**: 2-3 days after developer completes fixes and obtains certificate

---

**QA Validation Completed By**: Claude Code (QA Instance)
**Date**: 2025-09-30
**Status**: Configuration validated, awaiting developer fixes

---

## Appendix A: Quick Reference

### Files Created by QA
- [docs/TEST_PLANS.md](docs/TEST_PLANS.md) - Comprehensive testing procedures
- [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) - Security audit checklist
- [docs/QA_VALIDATION_REPORT.md](docs/QA_VALIDATION_REPORT.md) - This report

### Files Reviewed by QA
- [build/entitlements.mac.plist](../build/entitlements.mac.plist) - Entitlements configuration
- [package.json](../package.json) - Build configuration

### Files Pending Creation (Developer)
- docs/RELEASE.md - Release process documentation

### Key Commands for Developer

**Build Commands**:
```bash
npm run build              # Build renderer and main
npm run electron:pack      # Package for testing (unsigned)
npm run electron:dist      # Create distributable (signed if cert present)
```

**Validation Commands**:
```bash
npm run type-check         # Check TypeScript types
npm test                   # Run unit tests
npm run test:e2e           # Run end-to-end tests
```

**Signing Verification Commands**:
```bash
codesign -dv --verbose=4 "App.app"
codesign -d --entitlements - "App.app"
spctl -a -vv "App.app"
```

### Next Handoff

**To Developer Instance**:
- Read this entire report
- Address P0 issues (hardened runtime, gatekeeper, RELEASE.md)
- Address P1 issues (excessive entitlements, TypeScript errors, test failures)
- Obtain Apple Developer certificate
- Build and test signed build
- Hand back to QA for signed build testing

**To PM**:
- Sprint 5 timeline may need adjustment based on certificate acquisition
- Consider budgeting $99/year for Apple Developer account
- Plan for 2-3 day turnaround after certificate obtained
- Monitor developer progress on critical issues
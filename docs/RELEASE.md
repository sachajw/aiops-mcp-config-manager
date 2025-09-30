# MCP Configuration Manager - Release Guide

This guide covers building, code signing, and releasing MCP Configuration Manager for macOS distribution.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Certificate Setup](#certificate-setup)
- [Environment Configuration](#environment-configuration)
- [Building for Distribution](#building-for-distribution)
- [Code Signing Verification](#code-signing-verification)
- [Notarization Process](#notarization-process)
- [Release Checklist](#release-checklist)
- [Troubleshooting](#troubleshooting)
- [CI/CD Setup (Optional)](#cicd-setup-optional)

---

## Prerequisites

### Required Software

1. **Xcode Command Line Tools** (Already installed ✓)
   ```bash
   xcode-select --install  # If needed
   xcode-select -p  # Verify: should show /Library/Developer/CommandLineTools or /Applications/Xcode.app
   ```

2. **Node.js & npm** (Already in use)
   ```bash
   node --version  # v16+ required
   npm --version
   ```

3. **Apple Developer Account**
   - Individual or Organization account ($99/year)
   - Required for code signing and notarization
   - Sign up at: https://developer.apple.com/programs/

### Understanding Code Signing Requirements

**Why Code Signing is Necessary:**
- macOS Gatekeeper requires all apps to be signed
- Users will see security warnings without proper signing
- Notarization is mandatory for macOS 10.15+ (Catalina and later)
- Apps distributed outside Mac App Store must use Developer ID certificates

**Certificate Types:**
- **Developer ID Application**: For apps distributed outside Mac App Store (our use case)
- **Mac App Store Distribution**: For Mac App Store submission only
- **Development**: For local testing only (not for distribution)

---

## Certificate Setup

### Step 1: Obtain Developer ID Application Certificate

1. **Log in to Apple Developer Portal**
   - Go to: https://developer.apple.com/account/resources/certificates/list
   - Sign in with your Apple Developer account

2. **Create Certificate**
   - Click the **+** button to create a new certificate
   - Select **Developer ID Application** under "Software"
   - Click **Continue**

3. **Generate Certificate Signing Request (CSR)**

   On your Mac:
   - Open **Keychain Access** (Applications > Utilities > Keychain Access)
   - From menu: Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority
   - Fill in:
     - **User Email Address**: Your Apple ID email
     - **Common Name**: Your name or company name
     - **CA Email Address**: Leave empty
     - Select: **Saved to disk**
     - Click **Continue** and save the CSR file

4. **Upload CSR**
   - Back in Apple Developer Portal
   - Upload your CSR file
   - Click **Continue**
   - Download the generated certificate file (.cer)

5. **Install Certificate**
   - Double-click the downloaded .cer file
   - It will be added to your Keychain Access automatically
   - Verify in Keychain Access > My Certificates
   - You should see: "Developer ID Application: Your Name (Team ID)"

### Step 2: Export Certificate for Electron Builder

Electron-builder needs the certificate in p12/pfx format:

1. **Open Keychain Access**
   - Go to **My Certificates**
   - Find your "Developer ID Application" certificate
   - Expand the certificate to show the private key

2. **Export to p12**
   - Right-click the certificate (not the private key)
   - Select **Export "Developer ID Application: ..."**
   - Choose location and filename (e.g., `electron-signing-cert.p12`)
   - **Important**: Set a strong password (you'll need this later)
   - Click **Save**

3. **Secure the Certificate File**
   ```bash
   # Move to secure location (do NOT commit to git)
   mv ~/Downloads/electron-signing-cert.p12 ~/.electron-signing/
   chmod 600 ~/.electron-signing/electron-signing-cert.p12
   ```

### Step 3: Get Your Team ID

Your Team ID is required for notarization:

```bash
# View certificate details
security find-identity -v -p codesigning
```

Output will show:
```
1) ABC123DEF4 "Developer ID Application: Your Name (TEAM_ID)"
```

The `TEAM_ID` (usually 10 characters) is what you need.

### Step 4: Create App-Specific Password

Required for notarization authentication:

1. Go to: https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Under **Security** > **App-Specific Passwords**
4. Click **Generate Password**
5. Label it: "MCP Config Manager Notarization"
6. Copy the generated password (format: xxxx-xxxx-xxxx-xxxx)
7. **Save this securely** - you can't view it again

---

## Environment Configuration

### Local Development Setup

Create a `.env.local` file in the project root (already in `.gitignore`):

```bash
# Apple Developer Credentials
APPLE_ID="your-apple-id@example.com"
APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
APPLE_TEAM_ID="YOUR_TEAM_ID"

# Code Signing Certificate
CSC_LINK="/Users/yourname/.electron-signing/electron-signing-cert.p12"
CSC_KEY_PASSWORD="your-p12-password"

# Optional: Notarization settings
NOTARIZE="true"
```

### Update package.json

Replace the placeholder Team ID in `package.json`:

```json
"notarize": {
  "teamId": "YOUR_ACTUAL_TEAM_ID"  // Replace TEAM_ID_PLACEHOLDER
}
```

### Security Best Practices

**⚠️ NEVER commit these to git:**
- `.env.local` (already in .gitignore)
- Certificate files (.p12, .cer, .pem)
- Passwords or tokens

**✓ DO:**
- Store certificates in a secure location outside the project
- Use environment variables for credentials
- Use separate certificates for CI/CD (if applicable)
- Keep backups of certificates securely (encrypted)

---

## Building for Distribution

### Development Build (Unsigned)

For local testing without signing:

```bash
npm run build
npm run electron:pack  # Creates unpackaged app in release/ directory
```

### Production Build (Signed & Notarized)

For distribution to users:

```bash
# 1. Ensure environment variables are set
source .env.local  # or export variables manually

# 2. Build the application
npm run build

# 3. Create distributable DMG (signed and notarized)
npm run electron:dist
```

**What happens during build:**
1. TypeScript compilation (renderer + main process)
2. Vite builds the frontend assets
3. Electron-builder packages the app
4. Code signing with hardened runtime
5. DMG creation for both arm64 and x64
6. Automatic notarization (if credentials provided)
7. DMG files created in `release/` directory

**Build output:**
```
release/
├── MCP Configuration Manager-0.1.8-arm64.dmg  # Apple Silicon
├── MCP Configuration Manager-0.1.8.dmg        # Intel
└── mac-arm64/                                  # Unpacked app (for debugging)
    └── MCP Configuration Manager.app
```

### Build Without Notarization

If you want to skip notarization (faster, but requires manual Gatekeeper bypass):

```bash
NOTARIZE="false" npm run electron:dist
```

---

## Code Signing Verification

After building, verify the app is properly signed:

### Check Code Signature

```bash
# Verify app signature
codesign -dv --verbose=4 "release/mac-arm64/MCP Configuration Manager.app"
```

**Expected output:**
```
Executable=/path/to/MCP Configuration Manager.app/Contents/MacOS/MCP Configuration Manager
Identifier=com.mcptools.config-manager
Format=app bundle with Mach-O universal (x86_64 arm64)
CodeDirectory v=20500 size=... flags=0x10000(runtime) hashes=...
Signature size=...
Authority=Developer ID Application: Your Name (TEAM_ID)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
Timestamp=...
```

**Key indicators:**
- ✅ `flags=0x10000(runtime)` - Hardened runtime enabled
- ✅ `Authority=Developer ID Application` - Proper certificate
- ✅ Timestamp present - Signed with timestamp

### Check Entitlements

```bash
# Display app entitlements
codesign -d --entitlements - "release/mac-arm64/MCP Configuration Manager.app"
```

**Expected entitlements:**
- `com.apple.security.cs.allow-jit` - For Node.js JIT
- `com.apple.security.network.client` - For MCP connections
- `com.apple.security.network.server` - For spawning servers
- `com.apple.security.inherit` - For child processes
- `com.apple.security.files.user-selected.read-write` - Config file access

### Check for Hardened Runtime

```bash
# Verify hardened runtime
codesign -d --verbose "release/mac-arm64/MCP Configuration Manager.app" 2>&1 | grep -i runtime
```

Should output: `flags=0x10000(runtime)`

### Verify Gatekeeper Will Accept It

```bash
# Test Gatekeeper assessment (before notarization)
spctl -a -vv "release/mac-arm64/MCP Configuration Manager.app"
```

**Before notarization:**
```
rejected
source=Developer ID
origin=Developer ID Application: Your Name (TEAM_ID)
```

**After notarization:**
```
accepted
source=Notarized Developer ID
origin=Developer ID Application: Your Name (TEAM_ID)
```

---

## Notarization Process

### Automatic Notarization (Recommended)

If environment variables are properly set, electron-builder handles notarization automatically:

```bash
# Build with automatic notarization
npm run electron:dist
```

Electron-builder will:
1. Sign the app with hardened runtime
2. Create DMG
3. Submit DMG to Apple for notarization
4. Wait for notarization completion
5. Staple notarization ticket to DMG

**This can take 5-15 minutes.** You'll see:
```
• notarizing        pkg=release/MCP Configuration Manager-0.1.8-arm64.dmg
• notarization successful
• stapling          pkg=release/MCP Configuration Manager-0.1.8-arm64.dmg
```

### Manual Notarization (If Needed)

If automatic notarization fails, you can notarize manually:

```bash
# 1. Submit for notarization
xcrun notarytool submit \
  "release/MCP Configuration Manager-0.1.8-arm64.dmg" \
  --apple-id "your-apple-id@example.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "YOUR_TEAM_ID" \
  --wait

# 2. Check notarization status
xcrun notarytool info <request-uuid> \
  --apple-id "your-apple-id@example.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "YOUR_TEAM_ID"

# 3. If successful, staple the ticket
xcrun stapler staple "release/MCP Configuration Manager-0.1.8-arm64.dmg"

# 4. Verify stapling
xcrun stapler validate "release/MCP Configuration Manager-0.1.8-arm64.dmg"
```

### Verify Notarization

```bash
# Check if DMG is notarized and stapled
spctl -a -vv -t install "release/MCP Configuration Manager-0.1.8-arm64.dmg"
```

**Expected output:**
```
accepted
source=Notarized Developer ID
origin=Developer ID Application: Your Name (TEAM_ID)
```

---

## Release Checklist

Use this checklist for each release:

### Pre-Release

- [ ] Update version in `package.json`
- [ ] Update CHANGELOG.md with release notes
- [ ] Run full test suite: `npm test && npm run test:e2e`
- [ ] Run type checking: `npm run type-check`
- [ ] Test app locally: `npm run electron:dev`
- [ ] Review and update USER_GUIDE.md if needed

### Build & Sign

- [ ] Set environment variables (CSC_LINK, APPLE_ID, etc.)
- [ ] Verify Team ID in package.json notarize config
- [ ] Clean previous builds: `rm -rf release/ dist/`
- [ ] Build for distribution: `npm run electron:dist`
- [ ] Verify both DMGs created (arm64 and x64)

### Verification

- [ ] Check code signature: `codesign -dv --verbose=4 "release/mac-arm64/MCP Configuration Manager.app"`
- [ ] Verify hardened runtime enabled
- [ ] Check entitlements: `codesign -d --entitlements -`
- [ ] Verify notarization: `spctl -a -vv -t install "release/MCP Configuration Manager-0.1.8-arm64.dmg"`
- [ ] Test DMG on clean Mac (or VM): Mount, drag to Applications, launch
- [ ] Verify no Gatekeeper warnings appear

### Release

- [ ] Create GitHub release tag: `git tag v0.1.8 && git push origin v0.1.8`
- [ ] Upload DMGs to GitHub Releases
- [ ] Upload release notes
- [ ] Update download links in README.md
- [ ] Announce release (if applicable)

### Post-Release

- [ ] Test installation from GitHub release
- [ ] Monitor GitHub Issues for installation problems
- [ ] Update documentation site (if applicable)
- [ ] Increment version for next development cycle

---

## Troubleshooting

### Common Issues

#### 1. "No identity found" Error

**Error:**
```
Error: No identity found for signing
```

**Solutions:**
- Verify certificate is installed: `security find-identity -v -p codesigning`
- Check CSC_LINK path is correct
- Verify CSC_KEY_PASSWORD is correct
- Ensure certificate hasn't expired

#### 2. Notarization Fails

**Error:**
```
• notarization failed
  status: Invalid
```

**Solutions:**
```bash
# Get detailed error log
xcrun notarytool log <request-uuid> \
  --apple-id "your-apple-id@example.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "YOUR_TEAM_ID"
```

Common causes:
- Hardened runtime not enabled (check package.json)
- Missing or incorrect entitlements
- Code signing issues with dependencies
- Using wrong certificate type

#### 3. Gatekeeper Blocks App

**Error on user's Mac:**
```
"MCP Configuration Manager" cannot be opened because the developer cannot be verified
```

**Causes:**
- App not notarized
- Notarization ticket not stapled
- User downloaded partial/corrupted file

**User workaround (temporary):**
```bash
# One-time bypass (user runs this)
xattr -cr "/Applications/MCP Configuration Manager.app"
```

**Proper fix:**
- Ensure proper notarization
- Verify stapling: `stapler validate "release/...dmg"`

#### 4. Hardened Runtime Crashes

**Error:**
```
App crashes immediately on launch with EXC_BAD_ACCESS
```

**Causes:**
- Missing required entitlements
- Incorrect entitlement for app's functionality

**Solutions:**
- Review entitlements in `build/entitlements.mac.plist`
- Check Console.app for specific violation
- Add necessary entitlements (but minimize for security)

#### 5. Certificate Expired

**Error:**
```
certificate has expired
```

**Solutions:**
- Certificates expire after 5 years (Developer ID) or 1 year (others)
- Renew certificate in Apple Developer Portal
- Export new certificate and update CSC_LINK
- Rebuild and re-sign the app

#### 6. Keychain Access Issues

**Error:**
```
User interaction is not allowed
```

**Solutions:**
```bash
# Unlock keychain
security unlock-keychain ~/Library/Keychains/login.keychain-db

# Or set keychain to not lock
security set-keychain-settings -lut 7200 ~/Library/Keychains/login.keychain-db
```

### Debug Build Process

Enable verbose logging:

```bash
# Electron-builder debug mode
DEBUG=electron-builder npm run electron:dist

# See all notarization steps
DEBUG=electron-notarize npm run electron:dist
```

### Validate Configuration

Check your configuration before building:

```bash
# Verify environment variables
echo $CSC_LINK
echo $APPLE_ID
echo $APPLE_TEAM_ID

# Check certificate validity
security find-certificate -c "Developer ID Application" -p | openssl x509 -noout -dates

# Test code signing (dry run)
codesign --sign "Developer ID Application" --force --deep --verbose=4 /Applications/SomeApp.app
```

---

## CI/CD Setup (Optional)

### GitHub Actions Example

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Import Certificate
        env:
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
        run: |
          # Import certificate from base64
          echo "$CSC_LINK" | base64 --decode > certificate.p12
          # Import to keychain
          security create-keychain -p actions temp.keychain
          security default-keychain -s temp.keychain
          security unlock-keychain -p actions temp.keychain
          security import certificate.p12 -k temp.keychain -P "$CSC_KEY_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple: -s -k actions temp.keychain

      - name: Build & Release
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run electron:dist

      - name: Upload Release Assets
        uses: softprops/action-gh-release@v1
        with:
          files: |
            release/*.dmg
```

### GitHub Secrets Required

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

- `CSC_LINK`: Base64-encoded p12 certificate
  ```bash
  base64 -i electron-signing-cert.p12 | pbcopy
  ```
- `CSC_KEY_PASSWORD`: P12 password
- `APPLE_ID`: Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Your Team ID

---

## Additional Resources

### Apple Documentation
- [Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [Notarization Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime)

### Electron Resources
- [Electron Builder Documentation](https://www.electron.build/)
- [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [@electron/notarize](https://github.com/electron/notarize)

### Tools
- **Keychain Access**: View and manage certificates
- **Console.app**: Debug app launch failures
- **Activity Monitor**: Check if app is running properly
- **spctl**: Test Gatekeeper assessment
- **codesign**: Inspect code signatures
- **notarytool**: Submit and check notarization

---

## Version History

### v0.1.8 (Current)
- Enabled hardened runtime for production builds
- Optimized entitlements for Electron 28+
- Removed `com.apple.security.cs.allow-unsigned-executable-memory` (not needed for Electron 12+)
- Added comprehensive notarization support
- Documented complete release process

---

**Last Updated:** 2025-09-30
**For Questions:** Open an issue on [GitHub](https://github.com/itsocialist/mcp-config-manager/issues)
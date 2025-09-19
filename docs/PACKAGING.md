# Packaging and Distribution Guide

## Overview

This guide covers building, packaging, code signing, and distributing the MCP Configuration Manager application.

## Current Status

✅ **Working**: The application successfully builds and creates DMG installers for macOS (both Intel and Apple Silicon).

⚠️ **Not Signed**: The app is not currently code signed or notarized, requiring users to bypass Gatekeeper on first launch.

## Building the Application

### Prerequisites

- Node.js 18+ and npm
- macOS for building macOS versions
- Xcode Command Line Tools (for macOS)

### Build Commands

```bash
# Development build
npm run electron:dev

# Production build only (no packaging)
npm run build

# Build and create installer packages
npm run electron:dist

# Create unpacked app (for testing)
npm run electron:pack
```

## Generated Files

After running `npm run electron:dist`, you'll find:

```
release/
├── MCP Configuration Manager-0.1.4-arm64.dmg    # Apple Silicon installer
├── MCP Configuration Manager-0.1.4-arm64.zip    # Apple Silicon archive
├── MCP Configuration Manager-0.1.4.dmg          # Intel Mac installer
├── MCP Configuration Manager-0.1.4.zip          # Intel archive
├── mac-arm64/                                   # Unpacked Apple Silicon app
└── mac/                                          # Unpacked Intel app
```

## Code Signing and Notarization

### Current Issue

The app builds successfully but is not code signed because no valid Developer ID certificate is available. This results in:
- Gatekeeper warnings on first launch
- Users must right-click and select "Open" to bypass the warning

### Requirements for Code Signing

1. **Apple Developer Account** ($99/year)
2. **Developer ID Application Certificate**
3. **Developer ID Installer Certificate** (optional, for pkg files)

### Setting Up Code Signing

#### Step 1: Get Apple Developer Account
1. Join the Apple Developer Program at https://developer.apple.com/
2. Wait for approval (usually within 48 hours)

#### Step 2: Create Certificates
1. Go to https://developer.apple.com/account/resources/certificates/list
2. Create a "Developer ID Application" certificate
3. Download and install in Keychain Access

#### Step 3: Configure Environment Variables
Create a `.env` file in the project root:

```bash
# Apple Developer credentials
APPLE_ID=your-apple-id@example.com
APPLE_ID_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=your-team-id

# Certificate identity (from Keychain)
CSC_LINK=path/to/certificate.p12
CSC_KEY_PASSWORD=certificate-password
```

#### Step 4: Update Build Configuration
The `electron-builder.yml` is already configured for signing. Once certificates are available, the build process will automatically sign the app.

### Notarization Process

After code signing, notarization is required for macOS 10.15+:

#### Manual Notarization
```bash
# Notarize the app
xcrun notarytool submit "release/MCP Configuration Manager-0.1.4-arm64.dmg" \
  --apple-id YOUR_APPLE_ID \
  --password YOUR_APP_PASSWORD \
  --team-id YOUR_TEAM_ID \
  --wait

# Staple the notarization
xcrun stapler staple "release/MCP Configuration Manager-0.1.4-arm64.dmg"
```

#### Automated Notarization
Add to `package.json`:

```json
"build": {
  "afterSign": "scripts/notarize.js"
}
```

Create `scripts/notarize.js`:

```javascript
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.mcptools.config-manager',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
```

## Distribution

### GitHub Releases (Recommended)

1. Create a new release on GitHub
2. Upload the DMG files
3. Add release notes
4. Publish the release

The application is configured to check for updates from GitHub releases.

### Direct Distribution

For testing or internal distribution:

1. Upload DMG files to a web server
2. Share download links
3. Include instructions for bypassing Gatekeeper (if not notarized)

## User Installation Instructions

### For Signed and Notarized Apps
1. Download the appropriate DMG file
2. Double-click to mount
3. Drag the app to Applications folder
4. Launch from Applications

### For Unsigned Apps (Current State)
1. Download the appropriate DMG file
2. Double-click to mount
3. Drag the app to Applications folder
4. **First Launch**:
   - Right-click the app in Applications
   - Select "Open" from the context menu
   - Click "Open" in the security dialog
5. Subsequent launches work normally

## Platform-Specific Packages

### macOS
- **DMG**: Recommended, provides drag-to-install experience
- **ZIP**: Alternative, simpler but less polished

### Windows (Future)
- **NSIS Installer**: Traditional installer
- **Portable EXE**: No installation required

### Linux (Future)
- **AppImage**: Universal, no installation
- **DEB**: For Debian/Ubuntu
- **RPM**: For Fedora/RHEL

## Troubleshooting

### Build Failures

#### Issue: "Cannot find module"
```bash
# Clean and reinstall
rm -rf node_modules dist release
npm install
npm run electron:dist
```

#### Issue: "Code signing failed"
- Ensure certificates are in Keychain
- Check certificate hasn't expired
- Verify APPLE_TEAM_ID is correct

#### Issue: "Notarization failed"
- Check Apple ID credentials
- Ensure app-specific password (not regular password)
- Verify bundle ID matches certificate

### Runtime Issues

#### Issue: App won't open on user's Mac
- Check macOS version compatibility
- Ensure correct architecture (Intel vs Apple Silicon)
- Verify Gatekeeper instructions were followed

## Automation

### GitHub Actions Workflow

Create `.github/workflows/build.yml` for automated builds:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18

    - name: Install dependencies
      run: npm ci

    - name: Build and package
      env:
        CSC_LINK: ${{ secrets.CERTIFICATES_P12 }}
        CSC_KEY_PASSWORD: ${{ secrets.CERTIFICATES_P12_PASSWORD }}
        APPLE_ID: ${{ secrets.APPLE_ID }}
        APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
        APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
      run: npm run electron:dist

    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: installers
        path: release/*.dmg
```

## Security Considerations

1. **Never commit credentials** to the repository
2. **Use environment variables** for sensitive data
3. **Enable hardened runtime** for better security
4. **Minimize entitlements** to required only
5. **Regular security audits** of dependencies

## Version Management

Update version in `package.json` before building:

```bash
# Patch version (0.1.4 -> 0.1.5)
npm version patch

# Minor version (0.1.4 -> 0.2.0)
npm version minor

# Major version (0.1.4 -> 1.0.0)
npm version major
```

## Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run tests: `npm test`
- [ ] Build locally: `npm run electron:dist`
- [ ] Test DMG installation on clean Mac
- [ ] Create GitHub release
- [ ] Upload DMG files
- [ ] Update download links in README
- [ ] Announce release

## Support

For packaging issues:
- Check [electron-builder documentation](https://www.electron.build/)
- Review [Apple's notarization docs](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- Open an issue on GitHub
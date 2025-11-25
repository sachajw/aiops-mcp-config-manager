/**
 * Custom signing and notarization script
 * Works around electron-builder deep signing issues
 */

const { execSync } = require('child_process');
const { notarize } = require('@electron/notarize');
const path = require('path');
const fs = require('fs');

const IDENTITY = 'Developer ID Application: Brian Dawson (2TUP433M28)';
const ENTITLEMENTS = path.join(__dirname, '../build/entitlements.mac.plist');

function signBinary(binaryPath, entitlements = null) {
  console.log(`Signing: ${path.basename(binaryPath)}`);

  let cmd = `codesign --force --sign "${IDENTITY}" --options runtime --timestamp`;

  if (entitlements) {
    cmd += ` --entitlements "${entitlements}"`;
  }

  cmd += ` "${binaryPath}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (error) {
    console.error(`Failed to sign ${binaryPath}:`, error.message);
    throw error;
  }
}

function findAndSignAll(appPath) {
  console.log('\n=== Deep Signing All Binaries ===\n');

  // Frameworks and libraries
  const frameworksPath = path.join(appPath, 'Contents', 'Frameworks');

  if (fs.existsSync(frameworksPath)) {
    // Sign Electron Framework libraries first
    const electronFramework = path.join(frameworksPath, 'Electron Framework.framework');
    if (fs.existsSync(electronFramework)) {
      const libsPath = path.join(electronFramework, 'Versions', 'A', 'Libraries');
      if (fs.existsSync(libsPath)) {
        const libs = fs.readdirSync(libsPath).filter(f => f.endsWith('.dylib'));
        libs.forEach(lib => {
          signBinary(path.join(libsPath, lib));
        });
      }

      // Sign chrome_crashpad_handler
      const crashpadHandler = path.join(electronFramework, 'Versions', 'A', 'Helpers', 'chrome_crashpad_handler');
      if (fs.existsSync(crashpadHandler)) {
        signBinary(crashpadHandler);
      }

      // Sign the main framework binary
      const frameworkBinary = path.join(electronFramework, 'Versions', 'A', 'Electron Framework');
      if (fs.existsSync(frameworkBinary)) {
        signBinary(frameworkBinary);
      }

      // Re-sign the entire Electron Framework bundle
      signBinary(electronFramework);
    }

    // Sign other frameworks (sign binaries first, then framework bundle)
    const frameworks = ['Squirrel.framework', 'ReactiveObjC.framework', 'Mantle.framework'];
    frameworks.forEach(fw => {
      const fwPath = path.join(frameworksPath, fw);
      if (fs.existsSync(fwPath)) {
        // Sign ShipIt if it exists (Squirrel)
        if (fw === 'Squirrel.framework') {
          const shipIt = path.join(fwPath, 'Versions', 'A', 'Resources', 'ShipIt');
          if (fs.existsSync(shipIt)) {
            signBinary(shipIt);
          }
        }

        const fwName = fw.replace('.framework', '');
        const binaryPath = path.join(fwPath, 'Versions', 'A', fwName);
        if (fs.existsSync(binaryPath)) {
          signBinary(binaryPath);
        }

        // Re-sign the entire framework to fix code signature
        signBinary(fwPath);
      }
    });

    // Sign helper apps
    const helperApps = fs.readdirSync(frameworksPath).filter(f => f.endsWith('.app'));
    helperApps.forEach(app => {
      const helperPath = path.join(frameworksPath, app);
      const helperBinary = path.join(helperPath, 'Contents', 'MacOS', app.replace('.app', ''));
      if (fs.existsSync(helperBinary)) {
        signBinary(helperBinary, ENTITLEMENTS);
      }
    });
  }

  // Sign main app binary
  const appName = path.basename(appPath, '.app');
  const mainBinary = path.join(appPath, 'Contents', 'MacOS', appName);
  if (fs.existsSync(mainBinary)) {
    console.log(`\nSigning main app: ${appName}`);
    signBinary(mainBinary, ENTITLEMENTS);
  }

  // Finally, sign the entire app bundle
  console.log(`\nSigning app bundle: ${path.basename(appPath)}`);
  signBinary(appPath, ENTITLEMENTS);

  console.log('\n✓ All binaries signed\n');
}

async function verifySignature(appPath) {
  console.log('=== Verifying Signature ===\n');

  try {
    execSync(`codesign --verify --deep --strict --verbose=2 "${appPath}"`, { stdio: 'inherit' });
    console.log('\n✓ Signature verification passed\n');
    return true;
  } catch (error) {
    console.error('\n✗ Signature verification failed\n');
    return false;
  }
}

async function notarizeApp(appPath) {
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    throw new Error('Missing notarization credentials');
  }

  console.log('=== Notarizing App ===\n');
  console.log(`  Apple ID: ${appleId}`);
  console.log(`  Team ID: ${teamId}`);
  console.log(`  App: ${path.basename(appPath)}\n`);

  try {
    await notarize({
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId,
    });

    console.log('\n✓ Notarization successful\n');

    // Staple the ticket to the app
    console.log('=== Stapling Notarization Ticket ===\n');
    try {
      execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'inherit' });
      console.log('\n✓ Ticket stapled to app\n');
    } catch (error) {
      console.error('\n⚠️ Stapling failed (continuing):', error.message);
      // Don't throw - app is still usable
    }
  } catch (error) {
    console.error('\n✗ Notarization failed:', error.message);
    throw error;
  }
}

// This function is called by electron-builder's afterSign hook
exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Custom Signing and Notarization`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Step 1: Deep sign all binaries
    findAndSignAll(appPath);

    // Step 2: Verify signature
    const verified = await verifySignature(appPath);
    if (!verified) {
      throw new Error('Signature verification failed');
    }

    // Step 3: Notarize
    await notarizeApp(appPath);

    console.log(`${'='.repeat(60)}`);
    console.log(`✓ Complete: App is signed and notarized`);
    console.log(`${'='.repeat(60)}\n`);
  } catch (error) {
    console.error(`\n✗ Process failed:`, error.message);
    throw error;
  }
};
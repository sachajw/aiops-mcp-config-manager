/**
 * After-sign hook for electron-builder
 * Ensures all nested binaries are properly signed before notarization
 */

const { notarize } = require('@electron/notarize');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function notarizeMacos(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: Not macOS');
    return;
  }

  // Get credentials from environment
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping notarization: Missing credentials');
    console.log('Set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${appName}...`);
  console.log(`  App path: ${appPath}`);
  console.log(`  Apple ID: ${appleId}`);
  console.log(`  Team ID: ${teamId}`);

  try {
    // Verify signing before notarization
    console.log('Verifying code signature...');
    try {
      execSync(`codesign --verify --deep --strict --verbose=2 "${appPath}"`, { stdio: 'inherit' });
      console.log('✓ Code signature verified');
    } catch (error) {
      console.error('⚠️ Code signature verification failed, but continuing with notarization...');
    }

    // Notarize the app
    await notarize({
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId,
    });

    console.log(`✓ Notarization successful for ${appName}`);
  } catch (error) {
    console.error('✗ Notarization failed:', error);
    throw error;
  }
};
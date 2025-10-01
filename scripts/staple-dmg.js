/**
 * After all artifacts are built, staple notarization tickets to DMGs
 */

const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  const { outDir, artifactPaths } = context;

  console.log('\n' + '='.repeat(60));
  console.log('Stapling Notarization Tickets to DMGs');
  console.log('='.repeat(60) + '\n');

  for (const artifact of artifactPaths) {
    if (artifact.endsWith('.dmg')) {
      console.log(`Stapling: ${path.basename(artifact)}`);

      try {
        execSync(`xcrun stapler staple "${artifact}"`, { stdio: 'pipe' });
        console.log(`✓ Stapled successfully\n`);

        // Verify stapling
        try {
          const output = execSync(`xcrun stapler validate "${artifact}"`, { encoding: 'utf8' });
          console.log(`Validation: ${output.trim()}\n`);
        } catch (err) {
          console.log(`⚠️ Validation warning (continuing): ${err.message}\n`);
        }
      } catch (error) {
        console.error(`✗ Failed to staple ${artifact}:`);
        console.error(`  ${error.message}\n`);
        // Don't throw - DMG is still usable without stapling
      }
    }
  }

  console.log('='.repeat(60));
  console.log('✓ DMG Processing Complete');
  console.log('='.repeat(60) + '\n');
};
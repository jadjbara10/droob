// ============================================================================
// دروب (Droob) — Android Lint Config Plugin
// Fixes: "ExtraTranslation" lint errors from expo-localization plugin
// which copies iOS infoPlist strings into Android locale resource files.
// Approach: Two-pronged — modifies build.gradle AND creates lint.xml
// ============================================================================
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const LINT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<lint>
    <issue id="ExtraTranslation" severity="ignore" />
    <issue id="MissingTranslation" severity="ignore" />
</lint>
`;

const withAndroidLint = (config) => {
  // Approach 1: Inject lint block into app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("abortOnError false")) {
      config.modResults.contents = config.modResults.contents.replace(
        /(android\s*\{)/,
        `$1
    lint {
        abortOnError false
        disable 'ExtraTranslation', 'MissingTranslation'
        checkReleaseBuilds false
    }`
      );
    }
    return config;
  });

  // Approach 2: Write lint.xml as backup (standard Android way)
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const lintPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'lint.xml'
      );
      fs.writeFileSync(lintPath, LINT_XML);
      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidLint;

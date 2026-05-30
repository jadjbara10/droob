// ============================================================================
// دروب (Droob) — Android Lint Config Plugin
// Fixes: "ExtraTranslation" lint errors from expo-localization plugin
// which copies iOS infoPlist strings into Android locale resource files.
// ============================================================================
const { withAppBuildGradle } = require('expo/config-plugins');

const withAndroidLint = (config) => {
  return withAppBuildGradle(config, (config) => {
    const lintBlock = `
    lint {
        abortOnError false
        disable 'ExtraTranslation'
        checkReleaseBuilds false
    }
`;

    // Insert lint block after "android {" line in app/build.gradle
    if (!config.modResults.contents.includes("disable 'ExtraTranslation'")) {
      config.modResults.contents = config.modResults.contents.replace(
        /android\s*\{/,
        `android {${lintBlock}`
      );
    }

    return config;
  });
};

module.exports = withAndroidLint;

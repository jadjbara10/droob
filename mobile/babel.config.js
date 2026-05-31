// ============================================================================
// دروب (Droob) — Babel Configuration
// Expo + NativeWind + Module Resolver for path aliases
// ============================================================================
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
            '@assets': './assets',
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@stores': './src/stores',
            '@types': './src/types',
            '@utils': './src/utils',
            '@i18n': './src/i18n',
            '@theme': './src/theme',
            '@hooks': './src/hooks',
            '@config': './src/config',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',  // MUST be last — processes after all other transforms
    ],
  };
};
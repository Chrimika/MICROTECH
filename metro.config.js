const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// On retire "svg" des assets et on l’ajoute comme source
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');
config.resolver.sourceExts.push('cjs');

module.exports = config;

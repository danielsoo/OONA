// Learn more: https://docs.expo.dev/guides/customizing-metro/
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The app imports pure TypeScript from the website's src/ (types, i18n,
// helpers) through the "@/*" tsconfig path, so Metro must watch it.
// Only this app's node_modules are used for packages.
config.watchFolders = [path.resolve(__dirname, "../src")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = config;

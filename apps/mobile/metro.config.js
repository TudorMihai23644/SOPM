// Configurația Metro pentru monorepo: Expo detectează singur workspace-urile npm;
// pachetul comun se compilează direct din sursa TypeScript, ca pe web.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const sharedEntry = path.resolve(__dirname, '../../packages/shared/src/index.ts');
const defaultResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@deadlinehero/shared') return { type: 'sourceFile', filePath: sharedEntry };
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;

// Metro para monorepo pnpm: observa la raíz del workspace (para transpilar los
// paquetes @aluna/* en TS crudo) y resuelve node_modules de la app y de la raíz.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// pnpm no aplana node_modules: las deps de cada paquete viven enlazadas dentro
// de .pnpm/<pkg>/node_modules/ como hermanas. Dejamos el lookup jerárquico ACTIVO
// (no lo desactivamos) para que Metro suba a esos directorios y resuelva, p.ej.,
// expo-modules-core desde dentro de `expo`. Los symlinks van habilitados.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;


import sourceMaps from 'rollup-plugin-include-sourcemaps';
import commonjs from '@rollup/plugin-commonjs';
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { normalizePath } from "@rollup/pluginutils";
import consts from 'rollup-plugin-consts';
import terser from "@rollup/plugin-terser";
import { readFileSync } from "fs";
import { access } from "fs/promises";

// Load Package.json
console.log(decodeURI(new URL("./package.json", import.meta.url).toString()));
const packagePath = normalizePath(decodeURI(new URL("./package.json", import.meta.url).toString()).slice(process.platform == "win32" ? 8 : 7));
const packageJson = JSON.parse(readFileSync(packagePath, { encoding: "utf-8" }));
// Options for packaging
const packageRollup = { packageDependencies: false, externalPackages: [], inlineSourceMaps: false, ...(packageJson.rollup || {}) };
const packageType = packageJson.type;
const exportsKeys =
  Object.entries(packageJson.exports || { ".": { default: "" } })
    // omit exports with only an types filed
    .filter(([key, value]) => (Object.keys(value).length > 1 || value.types === undefined))
    .map(([key, value]) => key);
// Dev Dependencies to error on
const devDependenciesList = Object.keys(packageJson.devDependencies || {});
// compiler switches
const production = process.env.prod === "true";
const development = !production;
// which type of sourcemaps should be created
const sourcemap = production ? false : packageRollup.inlineSourceMaps ? "inline" : true;


// list of all the plugins to use
let plugins = [
  manageDependencies(),
  consts({ production, development }),
  commonjs(),
  typescript({ noEmitOnError: true, outputToFilesystem: true }),
  sourceMaps(),
  nodeResolve(),
];
if (production) {
  if (devDependenciesList.includes("rollup-plugin-html-literals")) plugins.push((await import("rollup-plugin-html-literals")).default());
  plugins.push(terser({ format: { comments: false } }));
}

// export all exports defined in package.json exports
export default exportsKeys.map(mapExports);

// calculate the config for the export
function mapExports(name) {
  // transform exports name
  if (name.startsWith("./")) name = name.slice(2);
  if (name == ".") name = "index";
  let output = [];
  // export commonjs when module is not module
  if (packageType !== "module") output.push({
    file: `./dist/${name}.${packageType !== "commonjs" ? "c" : ""}js`,
    format: "commonjs",
    sourcemap,
  });
  // export esm when module is not commonjs
  if (packageType !== "commonjs") output.push({
    file: `./dist/${name}.${packageType !== "module" ? "m" : ""}js`,
    format: "esm",
    sourcemap,
  });
  // Config for export
  return {
    input: `./src/${name}.ts`,
    output,
    plugins
  };
}

// Plugin for checking devDependencies and mark dependencies as external
class ManageDependencies extends Error { }
function manageDependencies(options) {
  // Calculate external packages
  const dependenciesList = Object.keys(packageJson.dependencies || {});
  const externalPackages = [...packageRollup.externalPackages, ...packageRollup.packageDependencies ? [] : dependenciesList];

  // returns true, if the import String is part of a Package
  function matchesPackage(imported, packages) {
    for (let dependency of packages) {
      if (imported === dependency) return true;
      if (imported.startsWith(dependency + "/")) return true;
    }
    return false;
  }

  // returns the path of the related package.json of a file
  async function findPackage(importer) {
    let importerPath = importer.split("/").slice(0, -1);
    let path = importerPath.join("/");
    if (!importer.startsWith(path)) return null;
    let file;
    while (importerPath.length >= 1) {
      file = path + "/package.json";
      try {
        await access(file);
        return file;
      } catch { }
      importerPath = importerPath.slice(0, -1);
      path = importerPath.join("/");
    }
    return null;
  }

  // Throw on illegal modules and mark es external
  return {
    name: 'manage-dependencies',
    async resolveId(imported, importer, options) {
      if (importer === undefined) return null;
      if (/\0/.test(imported)) return null;
      if (await findPackage(normalizePath(importer)) !== packagePath) return matchesPackage(imported, externalPackages) ? false : null;
      if (matchesPackage(imported, devDependenciesList)) throw new ManageDependencies(`Dependency ${imported} is a devDependency and is not allowed to be imported (${importer})`);
      if (matchesPackage(imported, externalPackages)) return false;
      return null;
    }
  };
};
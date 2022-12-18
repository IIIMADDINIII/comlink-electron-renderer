import { defineConfig } from "rollup";
import sourceMaps from 'rollup-plugin-include-sourcemaps';
import commonjs from '@rollup/plugin-commonjs';
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from "@rollup/plugin-terser";
import * as fs from "fs";

const packageJson = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), { encoding: "utf-8" }));
const dependencies = packageJson.dependencies || {};
const dependenciesList = Object.keys(dependencies);
const externalPackages = [...dependenciesList, packageJson.name];

function externalFilter(moduleName) {
  for (let dependency of externalPackages) {
    if (moduleName === dependency) return true;
    if (moduleName.startsWith(dependency + "/")) return true;
  }
  return false;
}

export default defineConfig({
  input: "./src/index.ts",
  output: [{
    file: "./dist/index.cjs",
    format: "commonjs",
    sourcemap: true,
  }, {
    file: "./dist/index.mjs",
    format: "esm",
    sourcemap: true,
  }],
  external: externalFilter,
  plugins: [
    commonjs(),
    typescript({ noEmitOnError: true, outputToFilesystem: true }),
    sourceMaps(),
    nodeResolve(),
  ],
});
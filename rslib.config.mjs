import { createRequire } from "node:module"
import { defineConfig } from "@rslib/core"

const require = createRequire(import.meta.url)
const isProduction = process.env.NODE_ENV === "production"

export default defineConfig({
  lib: [
    {
      autoExternal: false,
      bundle: true,
      format: "esm",
      syntax: "es6",
    },
  ],
  source: {
    entry: {
      editor: "./src/editor.js",
      overrides: "./src/overrides.css",
    },
  },
  output: {
    cleanDistPath: false,
    distPath: {
      root: "django_prose_editor/static/django_prose_editor/",
      css: "",
      js: "",
    },
    filename: {
      js: "[name].js",
      css: "[name].css",
    },
    sourceMap: true,
    externals: {},
    minify: isProduction,
    target: "web",
  },
  tools: {
    postcss: (opts) => {
      opts.postcssOptions.plugins = [require("autoprefixer")()]
    },
  },
})

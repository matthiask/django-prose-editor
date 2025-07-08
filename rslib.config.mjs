import { createRequire } from "node:module"
import { defineConfig } from "@rslib/core"

const require = createRequire(import.meta.url)
const isProduction = process.env.NODE_ENV === "production"

const commonConfig = {
  autoExternal: false,
  bundle: true,
  format: "esm",
  syntax: "es6",
  output: {
    distPath: {
      root: "django_prose_editor/static/django_prose_editor/",
      css: "",
      js: "",
      font: "",
    },
    filename: {
      js: "[name].js",
      css: "[name].css",
    },
    sourceMap: true,
    minify: isProduction,
    target: "web",
  },
}

export default defineConfig({
  lib: [
    {
      ...commonConfig,
      source: {
        entry: {
          editor: "./src/editor.js",
          overrides: "./src/overrides.css",
          "material-icons": "./src/material-icons.css",
        },
      },
    },
    // Editor presets
    {
      ...commonConfig,
      source: {
        entry: {
          default: "./src/default.js",
          configurable: "./src/configurable.js",
        },
      },
      output: {
        ...commonConfig.output,
        externals: {
          "django-prose-editor/editor": "module django-prose-editor/editor",
        },
        chunkLoading: "import",
      },
    },
  ],
  tools: {
    postcss: (opts) => {
      opts.postcssOptions.plugins = [require("autoprefixer")()]
    },
  },
})
